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
 * v2.3.2965: SPRITE SHEETS.  Owner: "I also want to fit as many things as I
 * can on one sprite sheet for objects as long as it stays organized."  Two
 * kinds, one for each end of the pipe:
 *   - SHEET PICTURES (sheets.js): each land's objects packed as many to a
 *     ChatGPT picture as fit at their true size, in rows read like a page.
 *     A sheet brought back is cut into its objects, each named by where it
 *     stands (readingOrder, autoAssign), every name a select the owner can
 *     change; each object is then made from its pieces exactly as from a
 *     picture of its own (finishPieces).  An object's OWN picture, from its
 *     own prompt, always wins over its sheet's pieces.
 *   - SPRITE SHEETS FOR THE GAME (atlasFiles): "Download for the game" packs
 *     each land's finished objects into as few big pictures as hold them
 *     (one, mostly), with a PixiJS sheet file naming where each one is and
 *     where it stands (its anchor at its foot), so the game loads one file a
 *     land, the land you are in (CLAUDE.md, per-zone loading).
 *
 * v2.3.2971: a sheet's (and a set's) objects are FOUND BY COUNT
 * (style/process.js objectsIn) -- as many as it asks for, joined closest
 * first -- since partsOf's fixed reach glued close neighbours together
 * (owner: "even though there's space between the objects"); sheets read
 * the old way are read again once (FINDER).  And a building is planned 1.4
 * times as big (catalog.js PLOT_W), sizes chosen against the old plan moved
 * to match, once (SIZES_BASE).
 *
 * window.__objects is the handle tools/qa/object-studio.mjs drives.
 */
import { PLAN } from '../world/plan.js';
import { openStore } from '../world/store.js';
import { zipStore, unzip } from '../world/core/zip.js';
import { encodePalettePng } from '../world/core/png8.js';
import { PIXEL } from '../style/bible.js';
import { blobToCanvas, keyOut, partsOf, cropTo, splitObjects, objectsIn, cropObject, resize, ownPalette, hardenAndMap, mk, trim } from '../style/process.js';
import { loadSprites } from '../style/scene.js';
import { objectCatalog, GROUPS } from './catalog.js';
import { promptFor, sizeWords, FRAME_GAME_PX } from './prompts.js';
import { sheetsFor, sheetPrompt, boxOf, SHEET } from './sheets.js';
/* v2.3.2975: the game's sprite sheets are packed a few objects a page, each
   page a palette PNG (atlas.js) -- the same packing the repack tool uses */
import { packAtlas, pagesByColour, coloursIn, PAGE_KINDS } from './atlas.js';

const GPA = PIXEL.gamePxPerArtPx;      /* 0.5 game px a picture px */
const PX = 1 / GPA;                    /* 2 picture px a game px */
const OWN = PIXEL.ownColours || 64;    /* each object's own colours, shared by its set */
const DB = 'brotown-object-studio', STORES = ['raw', 'fin', 'misc'];
/* How the finished pieces were made; pieces made any other way are made
   again from the pictures as uploaded, on load. */
const MADE = 'object-studio v2.3.2974';   /* made again for the despill (v2.3.2972) and the background in gaps (v2.3.2973; on green too, v2.3.2974), style/process.js keyOut */
/* v2.3.2971: how a sheet's objects were found -- a sheet found any other
   way (partsOf's fixed reach, which glued close neighbours together) is
   read again on load, once, with objectsIn */
const FINDER = 'by count v2.3.2971';
const SIZES = [0.7, 0.8, 0.9, 1, 1.1, 1.25, 1.4];
/* v2.3.2971: the size menu's choices are shares of a building's planned
   size, which grew 1.4 times (catalog.js PLOT_W) -- so a choice made
   against the old plan is moved to the one nearest the same size, once,
   and a backup's by its own `size` */
const SIZES_BASE = 'plots x1.4 v2.3.2971';
function nearestSize(mul) {
  let best = 1, bd = Infinity;
  for (const s of SIZES) { const d = Math.abs(Math.log(mul / s)); if (d < bd) { bd = d; best = s; } }
  return best;
}
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
/* v2.3.2965: a sheet picture is kept in 'raw' under this key, beside the
   objects' own pictures */
const SHEET_KEY = (id) => `sheet:${id}`;
/* on a sheet, a part smaller than this share of the smallest object asked
   for is a speck, not an object */
const SPECK = 0.15;

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

const S = {
  cat: [], byId: Object.create(null),
  store: null, key: null,
  /* id -> { blob, name, type, at, promptId } */
  raw: new Map(),
  /* id -> { pieces: [{ png, w, h, thumb }], ratio, found, flat, colours, size, made, at,
     src: 'own' or the sheet it was made from (v2.3.2965) } */
  fin: new Map(),
  /* v2.3.2965: the sheet pictures -- the sheets (sheets.js), which sheet each
     object is on, the objects that keep a picture of their own; and
     sheet id -> { blob, name, type, at, promptId, boxes, assign, thumbs,
     flat, frameH, rows }: where each object was found on it, in reading
     order, and which object each one is (null: not used) */
  sheets: [], sheetById: Object.create(null), sheetOf: Object.create(null), alone: new Set(),
  sheetRaw: new Map(), sheetThumbs: new Map(), sheetCards: Object.create(null),
  /* the one sheet kept cut out while it is worked on */
  cut: null,
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

/* A picture, its flat background cut away.  `frameH` is its height before
   anything is cut: the frame its sizes are measured against (prompts.js). */
async function cutPicture(blob) {
  const src = await blobToCanvas(blob, 2048);
  /* ChatGPT sometimes draws the object on a scene, not one flat colour */
  const flat = flatBorder(src);
  const { canvas: cut } = keyOut(src);
  const frameH = src.height;
  release(src);
  return { cut, frameH, flat };
}

/* An object's OWN picture: one object and the loose bits round it, or its set */
async function makePieces(entry, blob, mul = 1) {
  const { cut, frameH, flat } = await cutPicture(blob);
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
  release(cut);
  if (!pieces.length) throw new Error('nothing was left once the background was cut away');
  return finishPieces(entry, pieces, frameH, flat, mul);
}

/* An object's pieces, cut out -- from its own picture or from a sheet -- made
   as the game will use them.  The pieces are let go. */
function finishPieces(entry, pieces, frameH, flat, mul) {
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

/* made pieces -> what is kept: PNGs, sizes, the card's copies, and where
   they came from ('own', or the sheet) */
async function keepPieces(made, mul, src = 'own') {
  const pieces = [];
  for (const c of made.canvases) {
    pieces.push({ png: await canvasToBlob(c), w: c.width, h: c.height, thumb: thumbOf(c) });
    release(c);
  }
  return { pieces, ratio: made.ratio, found: made.found, flat: made.flat, colours: made.colours, size: mul, made: MADE, at: Date.now(), src };
}
const storedFin = (f) => ({ ...f, pieces: f.pieces.map(({ png, w, h }) => ({ png, w, h })) });
const srcOf = (f) => (f && f.src) || 'own';

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

/* v2.3.2965: an object made from a sheet lets its pieces there go (they
   show as "not used"); one made from its own picture loses that picture,
   and its sheet's pieces, if it has any, take its place */
async function removePicture(id) {
  const f = S.fin.get(id);
  if (S.stage.id === id) hideStage();
  if (srcOf(f) !== 'own') {
    const rec = S.sheetRaw.get(f.src);
    if (rec) { rec.assign = rec.assign.map((a) => (a === id ? null : a)); await S.store.put('raw', SHEET_KEY(f.src), rec); }
    S.fin.delete(id);
    await S.store.del('fin', id);
    return;
  }
  S.raw.delete(id); S.fin.delete(id);
  await S.store.del('raw', id); await S.store.del('fin', id);
  const sid = S.sheetOf[id], rec = sid && S.sheetRaw.get(sid);
  if (rec && rec.assign.includes(id)) { await makeFromSheet(sid, [id]); dropCut(); }
}

async function setSize(id, mul) {
  if (mul === 1) delete S.sizes[id]; else S.sizes[id] = mul;
  await S.store.put('misc', 'sizes', { ...S.sizes });
  if (S.raw.has(id)) await finish(id);
  else if (srcOf(S.fin.get(id)) !== 'own') { await makeFromSheet(S.fin.get(id).src, [id]); dropCut(); }
}

/* ═══ v2.3.2965: sheet pictures ═══ */

/* The objects on a cut-out sheet.  Specks -- a part much smaller than the
   smallest object the sheet asks for -- are left out.  v2.3.2971: found BY
   COUNT (style/process.js objectsIn): as many as the sheet asks for, its
   parts joined closest first and stopped where the gaps jump -- partsOf's
   fixed 30 px reach glued neighbours ChatGPT drew close together into one
   (owner: "even though there's space between the objects").  Each keeps
   the parts it is made of, so it is cut out by them alone (cropBox). */
function sheetFind(cut, frameH, sheet) {
  const k = frameH / SHEET.h;   /* picture px a game px */
  const smallest = Math.min(...sheet.rows.flat().map((id) => { const b = boxOf(S.byId[id]); return b.w * b.h; }));
  const want = sheet.rows.flat().reduce((n, id) => n + S.byId[id].count, 0);
  return objectsIn(cut, want, { minArea: SPECK * smallest * k * k, relMin: 0 });
}
/* ...as rows read like a page: each a box in the picture's px */
function sheetRows(found) {
  return readingOrder(found.boxes).map((row) => row.map(({ x, y, w, h }) => ({ x, y, w, h })));
}
/* A box on the sheet cut out by its own parts -- a neighbour's overhang
   or a speck inside its box made clear -- or plainly, for a box the finder
   does not give (a record from before it) */
function cropBox(c, b) {
  const f = c.found && c.found.boxes.find((o) => o.x === b.x && o.y === b.y && o.w === b.w && o.h === b.h);
  return f ? cropObject(c.cut, c.found, f) : cropTo(c.cut, b);
}
/* each box's copy for the sheet's card */
async function boxThumbs(c, boxes) {
  const thumbs = [];
  for (const b of boxes) {
    const t = cropBox(c, b);
    thumbs.push(await canvasToBlob(t ? thumbOf(t) : mk(1, 1)));
    release(t);
  }
  return thumbs;
}

/* Rows, by how the parts overlap top to bottom: a part joins the row it
   shares the most height with (at least 40% of the shorter), so a short
   barrel beside a tall lamp post is one row, and the next row down is not.
   Rows top to bottom, each left to right. */
function readingOrder(parts) {
  const rows = [];
  for (const p of [...parts].sort((a, b) => a.y - b.y)) {
    let best = null, bestO = 0;
    for (const r of rows) {
      const o = Math.min(p.y + p.h, r.y1) - Math.max(p.y, r.y0);
      if (o > bestO) { bestO = o; best = r; }
    }
    if (best && bestO >= 0.4 * Math.min(p.h, best.y1 - best.y0)) {
      best.items.push(p); best.y0 = Math.min(best.y0, p.y); best.y1 = Math.max(best.y1, p.y + p.h);
    } else rows.push({ y0: p.y, y1: p.y + p.h, items: [p] });
  }
  rows.sort((a, b) => (a.y0 + a.y1) - (b.y0 + b.y1));
  for (const r of rows) r.items.sort((a, b) => (a.x + a.w / 2) - (b.x + b.w / 2));
  return rows.map((r) => r.items);
}

/* Which object each part is, in reading order: row by row, each kind's
   ones in the order the prompt asked for them -- or, when ChatGPT drew a
   different number of rows, simply in reading order.  Past the ones asked
   for, a part is not used. */
function autoAssign(sheet, rows) {
  const want = sheet.rows.map((ids) => ids.flatMap((id) => Array(S.byId[id].count).fill(id)));
  if (rows.length === want.length) return rows.flatMap((r, i) => r.map((_, j) => want[i][j] || null));
  const seq = want.flat();
  return rows.flat().map((_, i) => seq[i] || null);
}

/* the sheet kept cut out, while one is worked on */
async function sheetCut(id) {
  const raw = S.sheetRaw.get(id);
  if (S.cut && S.cut.id === id && S.cut.blob === raw.blob) return S.cut;
  dropCut();
  const c = await cutPicture(raw.blob);
  S.cut = { id, blob: raw.blob, ...c, found: sheetFind(c.cut, c.frameH, S.sheetById[id]) };
  return S.cut;
}

/* v2.3.2971: a sheet found the old way (no `finder`, or another), read
   again with this finder, once: new boxes, names by place again, copies */
async function rereadSheet(id, rec) {
  const sheet = S.sheetById[id];
  dropCut();
  const c = await cutPicture(rec.blob);
  const found = sheetFind(c.cut, c.frameH, sheet);
  const rows = sheetRows(found), boxes = rows.flat();
  S.cut = { id, blob: rec.blob, ...c, found };
  if (!boxes.length) return;
  Object.assign(rec, { boxes, assign: autoAssign(sheet, rows), thumbs: await boxThumbs(S.cut, boxes), rows: rows.length,
    frameH: c.frameH, flat: c.flat, finder: FINDER });
  await S.store.put('raw', SHEET_KEY(id), rec);
  await decodeSheetThumbs(id);
}
function dropCut() { if (S.cut) { release(S.cut.cut); S.cut = null; } }

async function decodeSheetThumbs(id) {
  const rec = S.sheetRaw.get(id), out = [];
  for (const b of (rec && rec.thumbs) || []) { try { out.push(await blobToCanvas(b, 512)); } catch (e) { out.push(mk(1, 1)); } }
  S.sheetThumbs.set(id, out);
}

/* `keep`: the names a backup recorded ({ assign, promptId }), used when it
   lines up with the parts found now (the same picture, so it does) */
async function addSheet(id, blob, name, keep = null) {
  const sheet = S.sheetById[id];
  if (!sheet) throw new Error(`no sheet ${id}`);
  dropCut();
  const c = await cutPicture(blob);
  const found = sheetFind(c.cut, c.frameH, sheet);
  const rows = sheetRows(found);
  const boxes = rows.flat();
  if (!boxes.length) { release(c.cut); throw new Error('nothing was left once the background was cut away'); }
  const thumbs = await boxThumbs({ ...c, found }, boxes);
  const kinds = new Set(sheet.rows.flat());
  /* a backup's names, when it was found the same way (v2.3.2971: a backup
     from the old finder had other boxes, so its names are not used) */
  const kept = keep && keep.finder === FINDER && Array.isArray(keep.assign) && keep.assign.length === boxes.length ? keep.assign.map((a) => (a && kinds.has(a) ? a : null)) : null;
  const rec = { blob, name: name || '', type: blob.type, at: Date.now(), promptId: (keep && keep.promptId) || promptId(sheetPrompt(sheet, S.byId)),
    boxes, assign: kept || autoAssign(sheet, rows), thumbs, flat: c.flat, frameH: c.frameH, rows: rows.length, finder: FINDER };
  S.sheetRaw.set(id, rec);
  S.cut = { id, blob, ...c, found };
  await S.store.put('raw', SHEET_KEY(id), rec);
  await decodeSheetThumbs(id);
  /* a sheet made again makes all its objects again, but any with its own
     picture (which wins) */
  for (const eid of sheet.rows.flat()) {
    const f = S.fin.get(eid);
    if (f && f.src === id && !rec.assign.includes(eid)) { S.fin.delete(eid); await S.store.del('fin', eid); }
  }
  await makeFromSheet(id);
  dropCut();
}

/* Each object on the sheet (or `only` these) made from the parts named
   after it -- but an object with its own picture keeps it. */
async function makeFromSheet(id, only = null) {
  const sheet = S.sheetById[id], rec = S.sheetRaw.get(id);
  if (!sheet || !rec) return;
  const c = await sheetCut(id);
  for (const eid of sheet.rows.flat()) {
    if (only && !only.includes(eid)) continue;
    if (S.raw.has(eid)) continue;
    const boxes = rec.boxes.filter((_, i) => rec.assign[i] === eid);
    if (!boxes.length) {
      if (srcOf(S.fin.get(eid)) === id) { S.fin.delete(eid); await S.store.del('fin', eid); if (S.stage.id === eid) hideStage(); }
      continue;
    }
    const pieces = boxes.map((b) => cropBox(c, b)).filter(Boolean);
    const mul = S.sizes[eid] || 1;
    const f = await keepPieces(finishPieces(S.byId[eid], pieces, c.frameH, rec.flat, mul), mul, id);
    S.fin.set(eid, f);
    await S.store.put('fin', eid, storedFin(f));
  }
}

/* the owner names part `index` of a sheet: an object on it, or null */
async function reassign(id, index, eid) {
  const rec = S.sheetRaw.get(id), sheet = S.sheetById[id];
  if (!rec || !sheet || index < 0 || index >= rec.assign.length) return;
  if (eid && !sheet.rows.flat().includes(eid)) return;
  const before = rec.assign[index];
  rec.assign[index] = eid || null;
  await S.store.put('raw', SHEET_KEY(id), rec);
  await makeFromSheet(id, [before, eid].filter(Boolean));
  dropCut();
}

async function removeSheet(id) {
  const sheet = S.sheetById[id];
  S.sheetRaw.delete(id); S.sheetThumbs.delete(id);
  await S.store.del('raw', SHEET_KEY(id));
  for (const eid of sheet.rows.flat()) {
    if (srcOf(S.fin.get(eid)) !== id) continue;
    if (S.stage.id === eid) hideStage();
    S.fin.delete(eid);
    await S.store.del('fin', eid);
  }
  dropCut();
}

async function loadAll() {
  const sizes = await S.store.get('misc', 'sizes');
  const rebase = (await S.store.get('misc', 'sizesBase')) !== SIZES_BASE;
  if (sizes && typeof sizes === 'object') for (const [k, v] of Object.entries(sizes)) {
    const e = S.byId[k];
    if (!e || !SIZES.includes(v)) continue;
    /* v2.3.2971: a building's 140% under the old plan is "as planned" now */
    const m = rebase && e.sizeWas ? nearestSize((v * e.sizeWas) / e.size) : v;
    if (m !== 1) S.sizes[k] = m;
  }
  if (rebase) { await S.store.put('misc', 'sizes', { ...S.sizes }); await S.store.put('misc', 'sizesBase', SIZES_BASE); }
  for (const k of await S.store.keys('raw')) {
    const rec = await S.store.get('raw', k);
    if (!rec || !rec.blob) continue;
    const key = String(k);
    if (key.startsWith('sheet:')) {
      const sid = key.slice(6);
      if (S.sheetById[sid] && Array.isArray(rec.boxes) && Array.isArray(rec.assign)) { S.sheetRaw.set(sid, rec); await decodeSheetThumbs(sid); }
    } else if (S.byId[key]) S.raw.set(key, rec);
  }
  /* v2.3.2971: sheets found the old way, read again with the finder that
     counts, once -- their objects are then made again below */
  let r = 0;
  for (const [sid, rec] of [...S.sheetRaw]) {
    if (rec.finder === FINDER) continue;
    $('status').textContent = `Reading your sheet pictures again with the better finder, once: ${++r}…`;
    try { await rereadSheet(sid, rec); } catch (err) { /* left as it was */ }
  }
  /* each object from its own picture, else from its sheet's parts */
  let n = 0;
  for (const e of S.cat) {
    const sid = S.sheetOf[e.id], rec = sid && S.sheetRaw.get(sid);
    const want = S.raw.has(e.id) ? 'own' : rec && rec.assign.includes(e.id) ? sid : null;
    if (!want) continue;
    const f = await S.store.get('fin', e.id);
    const mul = S.sizes[e.id] || 1;
    if (f && f.made === MADE && f.size === mul && srcOf(f) === want && Array.isArray(f.pieces) && f.pieces.length) {
      const pieces = [];
      for (const p of f.pieces) {
        const c = await blobToCanvas(p.png, 4096);
        pieces.push({ png: p.png, w: p.w, h: p.h, thumb: thumbOf(c) });
        release(c);
      }
      S.fin.set(e.id, { ...f, src: want, pieces });
    } else {
      $('status').textContent = `Making your objects again with this version, once: ${++n}…`;
      try { if (want === 'own') await finish(e.id); else await makeFromSheet(want, [e.id]); } catch (err) { S.fin.delete(e.id); }
    }
  }
  dropCut();
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
  return `${e.count === 1 ? 'One' : `${e.count} different ones`}, ${e.count === 1 ? '' : 'each '}${size}.`;
}
/* v2.3.2965: which sheet it is on, or why it has a picture of its own */
const groupName = (id) => (GROUPS.find((g) => g.id === id) || { name: id }).name;
const sheetName = (sh) => `${groupName(sh.group)}, sheet ${sh.n}${sh.of > 1 ? ` of ${sh.of}` : ''}`;
function sheetLine(e) {
  if (e.kind === 'building') return '';
  const sid = S.sheetOf[e.id];
  if (sid) return `On ${sheetName(S.sheetById[sid])}. Its own prompt below makes just this one, and a picture made with it wins over the sheet's.`;
  return e.key === 'green' && !S.cat.some((x) => x !== e && x.group === e.group && x.key === 'green' && S.sheetOf[x.id])
    ? 'Not on a sheet: it is the only pink or purple thing in its land, so it has a picture of its own.'
    : 'Not on a sheet: too big to share one, so it has a picture of its own.';
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
  const onSheet = sheetLine(e);
  if (onSheet) box.appendChild(el('div', 'ob-where', onSheet));
  if (e.key === 'green') box.appendChild(el('div', 'ob-where', 'Drawn on a green background, not magenta: it is pink or purple itself.'));
  if (raw && raw.promptId && raw.promptId !== promptId(promptFor(e))) {
    /* v2.3.2971: only its size changed -- the plan's buildings grew 1.4 times */
    const grew = e.sizeWas && raw.promptId === promptId(promptFor({ ...e, size: e.sizeWas }));
    const note = el('div', grew ? 'ob-note' : 'ob-note warn', grew
      ? 'Made when buildings were planned smaller. It is fine at the size you chose; the prompt now asks for it bigger in the picture, so making it again would only make its pixels match the ground\'s more closely.'
      : 'Made from an older prompt. Make it again with the prompt below whenever you like.');
    note.dataset.stale = e.id;
    box.appendChild(note);
  }
  const det = el('details');
  det.appendChild(el('summary', null, S.sheetOf[e.id] ? 'Its own prompt (just this one)' : 'The prompt'));
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
  const from = srcOf(f) === 'own' ? 'Made from its own picture.' : `Made from ${sheetName(S.sheetById[f.src])}.`;
  const fromLine = el('div', 'ob-where', from);
  fromLine.dataset.from = e.id;
  box.appendChild(fromLine);
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
  rm.addEventListener('click', async () => {
    const sid = srcOf(f) !== 'own' ? f.src : S.sheetOf[e.id];
    await busy('Removing…', () => removePicture(e.id));
    renderCard(e); renderCounts(); renderSaved();
    if (sid && S.sheetById[sid]) renderSheet(S.sheetById[sid]);
  });
  r2.appendChild(rm);
  box.appendChild(r2);
  const slot = el('div');
  slot.dataset.stage = e.id;
  slot.hidden = true;
  box.appendChild(slot);
}

/* v2.3.2965: a sheet picture's card: what is on it, its prompt, and once
   made, every object found on it with its name, which the owner can change */
function rowsText(sheet) {
  return sheet.rows.map((ids, i) => `Row ${i + 1}: ${ids.map((id) => { const e = S.byId[id]; return e.count > 1 ? `${e.name.toLowerCase()} (${e.count})` : e.name.toLowerCase(); }).join(', ')}.`).join(' ');
}
function renderSheet(sheet) {
  const box = S.sheetCards[sheet.id];
  if (!box) return;
  box.textContent = '';
  const rec = S.sheetRaw.get(sheet.id);
  const kinds = sheet.rows.flat();
  const asked = kinds.reduce((t, id) => t + S.byId[id].count, 0);
  const head = el('div', 'ob-head');
  const name = el('span', 'ob-name', `Sheet ${sheet.n}${sheet.of > 1 ? ` of ${sheet.of}` : ''}`);
  const chip = el('span', rec ? 'chip ok' : 'chip', rec ? 'made' : 'not made');
  chip.dataset.sheetChip = sheet.id;
  name.appendChild(chip);
  head.appendChild(name);
  box.appendChild(head);
  box.appendChild(el('div', 'ob-where', `${asked} objects in one wide picture. ${rowsText(sheet)}`));
  if (sheet.key === 'green') box.appendChild(el('div', 'ob-where', 'Drawn on a green background, not magenta: these are pink or purple themselves.'));
  if (rec && rec.promptId && rec.promptId !== promptId(sheetPrompt(sheet, S.byId))) {
    const note = el('div', 'ob-note warn', 'Made from an older prompt. Make it again with the prompt below whenever you like.');
    note.dataset.stale = sheet.id;
    box.appendChild(note);
  }
  const det = el('details');
  det.appendChild(el('summary', null, 'The sheet prompt'));
  const ta = el('textarea');
  ta.readOnly = true; ta.value = sheetPrompt(sheet, S.byId); ta.dataset.sheetPrompt = sheet.id;
  det.appendChild(ta);
  box.appendChild(det);
  const row = el('div', 'row');
  const copyBtn = el('button', null, 'Copy prompt');
  copyBtn.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(ta.value); toast('Prompt copied. Attach the style key in the chat.'); }
    catch (err) { det.open = true; ta.select(); toast('Select the prompt and copy it.'); }
  });
  row.appendChild(copyBtn);
  const lab = el('label', rec ? 'btn' : 'btn brass', rec ? 'Replace…' : 'Add sheet picture');
  const inp = el('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.dataset.sheetFile = sheet.id;
  inp.addEventListener('change', async () => {
    const file = inp.files && inp.files[0];
    inp.value = '';
    if (!file) return;
    try {
      await busy('Cutting out every object and naming it…', () => addSheet(sheet.id, file, file.name));
      renderSheet(sheet);
      for (const id of kinds) renderCard(S.byId[id]);
      renderCounts(); renderSaved();
      const r = S.sheetRaw.get(sheet.id);
      toast(`${r.boxes.length} objects found on the sheet. Check the names under each.`);
    } catch (err) { toast(`That picture could not be used: ${err.message || err}`, true); }
  });
  lab.appendChild(inp);
  row.appendChild(lab);
  if (rec) {
    const rm = el('button', 'danger', 'Remove');
    rm.dataset.removeSheet = sheet.id;
    rm.addEventListener('click', async () => {
      await busy('Removing…', () => removeSheet(sheet.id));
      renderSheet(sheet);
      for (const id of kinds) renderCard(S.byId[id]);
      renderCounts(); renderSaved();
    });
    row.appendChild(rm);
  }
  box.appendChild(row);
  if (!rec) return;
  const notes = [];
  if (rec.flat < FLAT_MIN) notes.push(`The background is not one flat colour, so it could not be cut out cleanly. Ask for it on one flat ${sheet.key === 'green' ? 'bright green' : 'magenta'} background, with nothing else in the picture.`);
  if (rec.boxes.length !== asked) notes.push(`Found ${rec.boxes.length} objects; the sheet asks for ${asked}. Two that touch count as one. Check the names below, or ask again with them "not touching, with space between".`);
  else if (rec.rows !== sheet.rows.length) notes.push(`The rows came out differently from the prompt, so the names were given in reading order. Check them below.`);
  for (const t of notes) { const n = el('div', 'ob-note warn', t); n.dataset.warn = sheet.id; box.appendChild(n); }
  const own = kinds.filter((id) => S.raw.has(id) && rec.assign.includes(id));
  if (own.length) box.appendChild(el('div', 'ob-where', `${own.map((id) => S.byId[id].name).join(', ')}: kept ${own.length > 1 ? 'their' : 'its'} own picture, which wins over the sheet's.`));
  box.appendChild(el('div', 'ob-where', 'What each one is (tap to change):'));
  const grid = el('div', 'sheet-grid');
  const thumbs = S.sheetThumbs.get(sheet.id) || [];
  rec.boxes.forEach((b, i) => {
    const cell = el('div', 'sheet-cell');
    const t = thumbs[i];
    if (t) { const c = mk(t.width, t.height); c.getContext('2d').drawImage(t, 0, 0); cell.appendChild(c); }
    const sel = el('select');
    sel.dataset.assign = `${sheet.id}|${i}`;
    sel.setAttribute('aria-label', `Object ${i + 1} on the sheet`);
    for (const id of kinds) { const o = el('option', null, S.byId[id].name); o.value = id; sel.appendChild(o); }
    const none = el('option', null, 'Not used'); none.value = ''; sel.appendChild(none);
    sel.value = rec.assign[i] || '';
    sel.addEventListener('change', async () => {
      const before = rec.assign[i];
      await busy('Making it again…', () => reassign(sheet.id, i, sel.value || null));
      renderSheet(sheet);
      for (const id of [before, sel.value].filter(Boolean)) renderCard(S.byId[id]);
      renderCounts(); renderSaved();
    });
    cell.appendChild(sel);
    grid.appendChild(cell);
  });
  box.appendChild(grid);
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
    /* v2.3.2965: its sheet pictures first: the quickest way to make them */
    const sheets = S.sheets.filter((sh) => sh.group === gr.id);
    if (sheets.length) {
      det.appendChild(el('h3', 'sub-h', sheets.length > 1 ? `Sheet pictures: ${sheets.length} make every object below` : 'Sheet picture: one makes every object below'));
      det.appendChild(el('p', 'mut', `A sheet is one ChatGPT picture of many objects in tidy rows, each kind together. Bring it back and every object on it is cut out and named for you; check the names under each.${S.alone.size && list.some((e) => S.alone.has(e.id)) ? ' The few too big to share, or the only pink or purple thing here, have a picture of their own.' : ''}`));
      for (const sh of sheets) {
        const box = el('div', 'ob sheet');
        box.id = `sheet-${sh.id}`;
        S.sheetCards[sh.id] = box;
        det.appendChild(box);
        renderSheet(sh);
      }
      det.appendChild(el('h3', 'sub-h', 'The objects'));
    }
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
  for (const r of [...S.raw.values(), ...S.sheetRaw.values()]) if (r && r.at > last) last = r.at;
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

/* The backup: every picture as uploaded -- objects' own and the sheets
   (v2.3.2965, with where each object was found on its sheet and what it
   is) -- every finished piece, and the size choices. */
async function exportFiles() {
  const files = [], made = [], sheets = [];
  for (const e of S.cat) {
    const f = S.fin.get(e.id);
    if (!f) continue;
    const src = srcOf(f), raw = src === 'own' ? S.raw.get(e.id) : S.sheetRaw.get(src);
    if (!raw) continue;
    const pieces = [];
    for (let i = 0; i < f.pieces.length; i++) {
      const p = f.pieces[i], file = `${e.id}-${i + 1}.png`;
      files.push({ name: `objects/${file}`, data: new Uint8Array(await p.png.arrayBuffer()) });
      /* `foot`: where it touches the ground, in its own px -- the middle of
         its bottom row, until the placing round gives each a footprint */
      pieces.push({ file, w: p.w, h: p.h, gameW: p.w * GPA, gameH: p.h * GPA, foot: [Math.round(p.w / 2), p.h] });
    }
    if (src === 'own') files.push({ name: `originals/${e.id}.${extOf(raw.name, raw.blob.type)}`, data: new Uint8Array(await raw.blob.arrayBuffer()) });
    made.push({
      id: e.id, name: e.name, group: e.group, kind: e.kind, count: e.count, fit: e.fit, size: e.size,
      sizeMul: f.size, pixelRatio: Math.round(f.ratio * 100) / 100, from: src, madeFrom: raw.promptId || null, pieces,
    });
  }
  for (const sh of S.sheets) {
    const rec = S.sheetRaw.get(sh.id);
    if (!rec) continue;
    files.push({ name: `originals/sheets/${sh.id}.${extOf(rec.name, rec.blob.type)}`, data: new Uint8Array(await rec.blob.arrayBuffer()) });
    sheets.push({ id: sh.id, group: sh.group, madeFrom: rec.promptId || null, boxes: rec.boxes, assign: rec.assign, finder: rec.finder || null });
  }
  const manifest = {
    tool: 'brotown-object-studio', version: 2, made: new Date().toISOString(),
    plan: { id: PLAN.id, version: PLAN.version },
    gamePxPerArtPx: GPA, ownColours: OWN, objects: made, sheets,
  };
  return { files, manifest, enc: new TextEncoder() };
}

async function exportZip() {
  const { files, manifest, enc } = await exportFiles();
  files.unshift({ name: 'manifest.json', data: enc.encode(JSON.stringify(manifest, null, 1)) });
  return zipStore(files);
}

/* ═══ v2.3.2965: THE GAME'S SPRITE SHEETS ═══
   Each land's finished objects packed into sprite sheets: in shelves,
   tallest first, ATLAS_PAD clear px between any two, ATLAS_MAX px a side at
   most (atlas.js).  Beside each picture a PixiJS sheet file (frames, and
   each frame's anchor at its foot: the middle of its bottom row;
   `meta.scale` 2, the art's px a game px, so the game's sprites come out in
   game px).  The pixels are the pieces' own, each frame the very piece the
   backup holds.
   v2.3.2975: a few objects a PAGE -- as many as keep the page's colours to
   255, so every page is a palette PNG (atlas.js pagesByColour): 5.0 MB for
   the owner's 75 objects where one sheet a land was 15.7 MB -- and the
   Wheel loads only the pages whose objects stand near you. */
async function atlasFiles(enc) {
  const files = [], atlases = [], where = Object.create(null);
  for (const g of GROUPS) {
    const objs = [];
    for (const e of S.cat) {
      if (e.group !== g.id || !S.fin.has(e.id)) continue;
      const items = [], colours = new Set();
      for (const [i, p] of S.fin.get(e.id).pieces.entries()) {
        const img = await blobToCanvas(p.png, 4096);
        coloursIn(img.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, img.width, img.height).data, colours);
        release(img);
        items.push({ w: p.w, h: p.h, name: `${e.id}-${i + 1}`, png: p.png });
      }
      objs.push({ id: e.id, colours, items });
    }
    if (!objs.length) continue;
    const pages = pagesByColour(objs, { kinds: PAGE_KINDS[g.id] || Infinity });
    for (let k = 0; k < pages.length; k++) {
      const pg = pages[k], name = `${g.id}-${k + 1}`;
      const c = mk(pg.w, pg.h), cg = c.getContext('2d', { willReadFrequently: true });
      const frames = {};
      for (const it of pg.items) {
        const img = await blobToCanvas(it.png, 4096);
        cg.drawImage(img, it.x, it.y);
        release(img);
        frames[it.name] = { frame: { x: it.x, y: it.y, w: it.w, h: it.h }, rotated: false, trimmed: false,
          spriteSourceSize: { x: 0, y: 0, w: it.w, h: it.h }, sourceSize: { w: it.w, h: it.h }, anchor: { x: 0.5, y: 1 } };
        where[it.name] = name;
      }
      /* palette numbers when the page has 255 colours or fewer, else full colour */
      const rgba = cg.getImageData(0, 0, pg.w, pg.h).data;
      const png = (await encodePalettePng(rgba, pg.w, pg.h, { clear: true })) || new Uint8Array(await (await canvasToBlob(c)).arrayBuffer());
      release(c);
      const json = { frames, meta: { app: 'brotown-object-studio', version: '1', image: `${name}.png`, format: 'RGBA8888', size: { w: pg.w, h: pg.h }, scale: String(PX) } };
      files.push({ name: `objects/${name}.png`, data: png }, { name: `objects/${name}.json`, data: enc.encode(JSON.stringify(json)) });
      atlases.push({ name, group: g.id, w: pg.w, h: pg.h, image: `${name}.png`, sheet: `${name}.json`, objects: pg.items.length, kinds: pg.objects });
    }
  }
  return { files, atlases, where };
}

/* the zips for GitHub: only what the game reads -- each land's sprite
   sheets and the manifest -- each zip under GAME_PART (GitHub's website
   takes files of up to 25 MB), each with the manifest */
const GAME_PART = 24e6;
async function exportGameZips(limit = GAME_PART) {
  const enc = new TextEncoder();
  const { files, atlases, where } = await atlasFiles(enc);
  const objects = [];
  for (const e of S.cat) {
    const f = S.fin.get(e.id);
    if (!f) continue;
    objects.push({
      id: e.id, name: e.name, group: e.group, kind: e.kind, count: e.count, fit: e.fit, size: e.size, sizeMul: f.size,
      pieces: f.pieces.map((p, i) => ({ frame: `${e.id}-${i + 1}`, atlas: where[`${e.id}-${i + 1}`], w: p.w, h: p.h, gameW: p.w * GPA, gameH: p.h * GPA, foot: [Math.round(p.w / 2), p.h] })),
    });
  }
  const manifest = {
    tool: 'brotown-object-studio', version: 2, made: new Date().toISOString(), forGame: true,
    plan: { id: PLAN.id, version: PLAN.version }, gamePxPerArtPx: GPA, atlases, objects,
  };
  const head = (n, of) => enc.encode(JSON.stringify({ ...manifest, part: n, parts: of }, null, 1));
  const room = limit - head(99, 99).length - 4096;
  /* a sprite sheet and its sheet file always travel in the same zip */
  const pairs = [];
  for (let i = 0; i < files.length; i += 2) pairs.push([files[i], files[i + 1]]);
  const groups = [[]];
  let size = 0;
  for (const pair of pairs) {
    const cost = pair.reduce((t, f) => t + f.data.length + 2 * f.name.length + 80, 0);
    if (size + cost > room && groups[groups.length - 1].length) { groups.push([]); size = 0; }
    groups[groups.length - 1].push(...pair);
    size += cost;
  }
  return groups.map((g, i) => ({ part: i + 1, parts: groups.length, bytes: zipStore([{ name: 'manifest.json', data: head(i + 1, groups.length) }, ...g]) }));
}

async function restoreZip(bytes) {
  const entries = await unzip(bytes);
  const byName = new Map(entries.map((f) => [f.name, f]));
  const mf = byName.get('manifest.json');
  const manifest = mf ? JSON.parse(new TextDecoder().decode(mf.data)) : null;
  const info = Object.create(null), sheetInfo = Object.create(null);
  for (const o of (manifest && manifest.objects) || []) if (o && typeof o.id === 'string') info[o.id] = o;
  for (const o of (manifest && manifest.sheets) || []) if (o && typeof o.id === 'string') sheetInfo[o.id] = o;
  for (const id of Object.keys(info)) {
    const o = info[id], e = S.byId[id];
    if (!e) continue;
    /* v2.3.2971: the same size as the backup's, whatever its plan said */
    const was = typeof o.size === 'number' && o.size > 0 ? o.size : e.size;
    const m = SIZES.includes(o.sizeMul) ? nearestSize((o.sizeMul * was) / e.size) : 1;
    if (m !== 1) S.sizes[id] = m; else delete S.sizes[id];
  }
  await S.store.put('misc', 'sizes', { ...S.sizes });
  let n = 0;
  /* v2.3.2965: the sheets first, each with the names it was given... */
  for (const f of entries) {
    const m = /^originals\/sheets\/([a-z0-9-]+)\.([a-z0-9]+)$/i.exec(f.name);
    if (!m || !S.sheetById[m[1]]) continue;
    const blob = new Blob([f.data], { type: mimeOf(m[2].toLowerCase()) });
    const o = sheetInfo[m[1]];
    await addSheet(m[1], blob, f.name.split('/').pop(), o ? { assign: o.assign, promptId: o.madeFrom, finder: o.finder } : null);
    n++;
  }
  /* ...then the objects' own pictures, which win */
  for (const f of entries) {
    const m = /^originals\/([a-z0-9-]+)\.([a-z0-9]+)$/i.exec(f.name);
    if (!m || !S.byId[m[1]]) continue;
    const id = m[1], o = info[id];
    const blob = new Blob([f.data], { type: mimeOf(m[2].toLowerCase()) });
    const rec = { blob, name: f.name.split('/').pop(), type: blob.type, at: Date.now(), promptId: (o && o.madeFrom) || null };
    S.raw.set(id, rec);
    await S.store.put('raw', id, rec);
    await finish(id);
    n++;
  }
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
      for (const sh of S.sheets) renderSheet(sh);
      for (const e of S.cat) renderCard(e);
      renderCounts(); renderSaved();
      toast(n ? `Restored ${n} picture${n === 1 ? '' : 's'}.` : 'Nothing to restore in that zip: it needs the backup from Download all.', !n);
    } catch (err) { toast(`That zip could not be restored: ${err.message || err}`, true); }
  });
}

/* ── start ── */

async function start() {
  await nextFrame();
  S.cat = objectCatalog();
  for (const e of S.cat) S.byId[e.id] = e;
  /* v2.3.2965: the sheet pictures, and which sheet each object is on */
  const packed = sheetsFor(S.cat);
  S.sheets = packed.sheets;
  for (const sh of S.sheets) { S.sheetById[sh.id] = sh; for (const id of sh.rows.flat()) S.sheetOf[id] = sh.id; }
  for (const id of packed.own) S.alone.add(id);
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
  $('status').textContent = `${S.cat.length} objects, ${S.cat.filter((e) => e.kind === 'building').length} of them buildings; ${S.sheets.length} sheet pictures make the other ${S.cat.filter((e) => S.sheetOf[e.id]).length}.`;
}

S.ready = start().catch((e) => { $('status').textContent = `Something went wrong: ${e.message || e}`; throw e; });

window.__objects = {
  S,
  api: { addPicture, removePicture, setSize, showStage, hideStage, exportZip, exportGameZips, restoreZip, promptFor, makePieces, promptId,
    addSheet, reassign, removeSheet, sheetPrompt, packAtlas },
};
