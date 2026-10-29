/* ═══ v2.3.3752: THE BODY UNDER ARMOUR, FROM THE COLOUR NUMBERS ═══
 *
 * The owner: "The game needs to be extremely memory efficient", and of the
 * memory plan's phase 2: "Make it so phase 2 finishes in a few hours".  On by
 * default with the rest of the look palette (`?lookpalette=0` turns it all
 * off); docs/specs/look-palette.md, "Armour".
 *
 * WHAT IT REPLACES.  Under a chest plate or greaves the body is not drawn as
 * it is: the masked bake (maskedBake.js, in maskedBakeWorker.js) erases it
 * under the plates, keeps the head, gives back the trousers the halo ate,
 * paints the chain belt (in the chest's metal, v2.3.3733) and the tumble's
 * head (v2.3.3732), and the result was a recoloured, cropped picture per LOOK,
 * per worn set, per frame -- a full set's stand and jog ~3 MB each, for you,
 * for the sets one equip away, and for every armoured player on your screen.
 *
 * WHAT IT IS NOW.  The bake still runs, unchanged, on the same worker -- it is
 * the one truth of what shows under which piece, and half of it judges the
 * body by its colours, so it cannot be a mask shared by every look -- but on
 * the body coloured from the shared numbers (lookExpand.js), and what comes
 * back is only what it DECIDED:
 *   - a BIT a display texel: the body's own texel shows there, or not.  The
 *     bits of a pose (all its facings) for one look in one worn set are a
 *     "book" of rows in ONE R8 atlas (MASK_W bytes wide), and the masked
 *     look's palette row says where its books start (entry 32 + the pose's
 *     index, lookPalette.js's layout); the shader drops a texel whose bit is
 *     0 before it blends, so the chip's filtering is the same as the bare body's;
 *   - the RESIDUE: the texels the bake drew that are not the body (the chain
 *     belt, the steel fill, the ghost fist's trousers), a small picture a frame
 *     drawn as its own sprite just above the body (entityRenderer
 *     _placeLookResidue).  Most frames have none.
 * A book is ~127 KB for stand + jog against ~3 MB of pictures.
 *
 * A frame not decided yet is drawn as the old path drew a frame not baked yet
 * (the caller's choice: the plain body, or a peer's last masked frame).
 *
 * Probe: window.__btLookArmour().
 */
import { Texture, Rectangle, BufferImageSource, ImageSource, glUploadBufferImageResource } from 'pixi.js';
import { lookPaletteWanted, lookPaletteOn, lookSetSheets, lookSheetBytes, lookSheetOf, setLookSheetBook, setLookMaskSource, MASK_W } from './lookPalette.js';
import { takePaletteRow, givePaletteRow, paletteRowWrite } from './paletteTex.js';

const MAX_ROWS = 1024;            /* the atlas at most: 2 MB (MASK_W x 1024 bytes) */
const GROW = 128;                 /* it grows by this many rows */
const IDLE_MS = 30000;            /* a masked look no one drew for this long lets go of its row and books */
const SWEEP_MS = 5000;
const _stats = { looks: 0, looksMade: 0, looksFreed: 0, books: 0, booksFull: 0, rowsFull: 0, atlasRows: 0,
  framesAsked: 0, framesDone: 0, framesFailed: 0, residues: 0, residueBytes: 0, keep: 0, near: 0, clear: 0, other: 0, maxNear: 0 };

/** Armour drawn from the numbers: the look palette on (`?lookpalette=0`: not). */
export function lookArmourOn() { return lookPaletteWanted() && lookPaletteOn(); }

/* ═══ THE BOOKS' LAYOUT ═══
   A pose's book holds every sheet of that pose of the body set, in the body
   manifest's own order (a pose P1 adds is a book of its own; nothing here
   lists them), each sheet from a whole atlas row: its display texels' bits,
   row by row.  Each sheet's header is told where (setLookSheetBook: the
   pose's index << 16 | its first row + 1). */
let _layout = null;
function layout() {
  if (_layout) return _layout;
  const names = lookSetSheets('body');
  if (!names) return null;
  const L = Object.create(null), poses = [], used = [];
  for (const sheet of names) {
    const sh = lookSheetOf('body', sheet);
    const B = sh && sh.src && sh.src._btLook;
    if (!B) continue;
    const pose = sheet.slice(0, sheet.indexOf('-'));
    let pi = poses.indexOf(pose);
    if (pi < 0) { pi = poses.length; poses.push(pose); used.push(0); }
    if (32 + pi > 63) continue;   /* the row is law: the armour's entries are 32-63 */
    const dw = B.w / B.ds, dh = B.n / B.ds;
    const rows = Math.ceil(dw * dh / 8 / MASK_W);
    L[sheet] = { row: used[pi], pose: pi, rows, dw, dh };
    used[pi] += rows;
    setLookSheetBook('body', sheet, pi * 65536 + L[sheet].row + 1);
  }
  for (const k in L) L[k].bookRows = used[L[k].pose];
  _layout = L;
  return L;
}
function lookMaskLayout(set, sheet) { const L = layout(); return (L && L[sheet]) || null; }

/* ═══ THE ATLAS ═══ */
let _src = null, _rows = 0;
const _free = [];                 /* [start, len] free row ranges, by start */
const _books = new Set();
function atlasSource() { return _src; }
setLookMaskSource(atlasSource);
function makeSource(rows) {
  const s = new BufferImageSource({
    resource: null, width: MASK_W, height: rows, format: 'r8unorm', scaleMode: 'nearest',
    alphaMode: 'no-premultiply-alpha', autoGenerateMipmaps: false, autoGarbageCollect: false, label: 'bt-look-mask',
  });
  s._btMask = true;
  return s;
}
function growTo(rows) {
  rows = Math.min(MAX_ROWS, Math.ceil(rows / GROW) * GROW);
  if (rows <= _rows) return _rows >= rows;
  if (_rows < rows) _free.push([_rows, rows - _rows]);
  merge();
  _rows = rows;
  const old = _src;
  _src = makeSource(rows);
  for (const b of _books) { b.dirty = true; b.lo = 0; b.hi = b.rows; }
  if (old) setTimeout(() => { try { old.destroy(); } catch (e) { /* gone */ } }, 0);
  _stats.atlasRows = rows;
  return true;
}
function merge() {
  _free.sort((a, b) => a[0] - b[0]);
  for (let i = 0; i + 1 < _free.length;) {
    if (_free[i][0] + _free[i][1] === _free[i + 1][0]) { _free[i][1] += _free[i + 1][1]; _free.splice(i + 1, 1); } else i++;
  }
}
function takeRows(n) {
  for (let pass = 0; pass < 2; pass++) {
    for (const f of _free) {
      if (f[1] < n) continue;
      const start = f[0];
      f[0] += n; f[1] -= n;
      if (!f[1]) _free.splice(_free.indexOf(f), 1);
      return start;
    }
    if (pass || _rows >= MAX_ROWS) break;
    growTo(_rows + n);
  }
  return -1;
}
function giveRows(start, n) { _free.push([start, n]); merge(); }
function newBook(rows) {
  const start = takeRows(rows);
  if (start < 0) { _stats.booksFull++; return null; }
  const b = { start, rows, bytes: new Uint8Array(rows * MASK_W), dirty: true, lo: 0, hi: rows };
  _books.add(b);
  _stats.books = _books.size;
  return b;
}
function dropBook(b) {
  if (!_books.delete(b)) return;
  giveRows(b.start, b.rows);
  b.bytes = null;
  _stats.books = _books.size;
  /* no armoured look left: the atlas goes too (made again for the next) */
  if (!_books.size && _src) {
    const old = _src;
    _src = null; _rows = 0; _free.length = 0; _stats.atlasRows = 0;
    setTimeout(() => { try { old.destroy(); } catch (e) { /* gone */ } }, 0);
  }
}
/* uploaded by hand: the whole atlas when the chip has none of it (or its size
   changed), else the books that changed.  The bits stay here as well (a book
   is ~127 KB) so a rebuilt renderer gets them again. */
{
  const U = glUploadBufferImageResource;
  const up = U.upload;
  U.upload = function (source, glTexture, gl, webGLVersion, targetOverride, forceAllocation = false) {
    if (!source || !source._btMask) return up.call(this, source, glTexture, gl, webGLVersion, targetOverride, forceAllocation);
    const target = targetOverride || glTexture.target;
    const w = MASK_W, h = source.pixelHeight;
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    const all = forceAllocation || glTexture.width !== w || glTexture.height !== h || glTexture._btMaskSrc !== source;
    if (all) {
      gl.texImage2D(target, 0, glTexture.internalFormat, w, h, 0, glTexture.format, glTexture.type, new Uint8Array(w * h));
      glTexture.width = w; glTexture.height = h; glTexture._btMaskSrc = source;
    }
    for (const b of _books) {
      if (!all && !b.dirty) continue;
      /* the rows that changed (a frame's cell is a dozen rows of its book) */
      const lo = all ? 0 : b.lo, hi = all ? b.rows : b.hi;
      if (b.start + b.rows <= h && hi > lo) gl.texSubImage2D(target, 0, 0, b.start + lo, w, hi - lo, glTexture.format, glTexture.type, b.bytes.subarray(lo * MASK_W, hi * MASK_W));
      b.dirty = false; b.lo = b.rows; b.hi = 0;
    }
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
  };
}
/* uploaded at once, before the frame is said to be decided: a frame drawn
   with its bits still on their way would draw the body see-through for a
   frame (a first cut waited for the next animation frame) */
function atlasChanged() {
  if (_src && !_src.destroyed) _src.update();
}

/* ═══ THE MASKED LOOKS: a look in a worn set ═══ */
const _mlooks = new Map();
let _baker = null;
/** entityRenderer gives the bake to run: baker({ look, worn, poseInfo, rank }) -> Promise<reply>. */
export function setLookArmourBaker(fn) { _baker = fn; }

const tkey = (t) => (t ? t[0] + ',' + t[1] + ',' + t[2] : '-');
function lookOf(entries) { return { key: entries.map((e) => e[0] + ':' + tkey(e[1])).join('/'), entries }; }
function baseRow(look) {
  const rgba = new Uint8Array(256 * 4);
  for (const [e, t] of look.entries) if (t) rgba.set([t[0], t[1], t[2], 255], e * 4);
  return rgba;
}
function mlookFor(look, wornSig, now) {
  const key = look.key + '|' + wornSig;
  let ml = _mlooks.get(key);
  if (ml) { ml.used = now; return ml; }
  const rgba = baseRow(look);
  const row = takePaletteRow(rgba);
  if (row < 0) { _stats.rowsFull++; return null; }
  ml = { key, look, wornSig, row, rgba, used: now, books: Object.create(null), sheets: Object.create(null) };
  _mlooks.set(key, ml);
  _stats.looksMade++; _stats.looks = _mlooks.size;
  sweepSoon();
  return ml;
}
function bookFor(ml, lay) {
  let b = ml.books[lay.pose];
  if (b) return b;
  b = newBook(lay.bookRows);
  if (!b) return null;
  ml.books[lay.pose] = b;
  const e = (32 + lay.pose) * 4;
  ml.rgba[e] = b.start & 255; ml.rgba[e + 1] = b.start >> 8; ml.rgba[e + 2] = 0; ml.rgba[e + 3] = 255;
  paletteRowWrite(ml.row, ml.rgba);
  return b;
}
function freeMlook(ml) {
  _mlooks.delete(ml.key);
  ml.row >= 0 && givePaletteRow(ml.row);
  ml.row = -1;
  for (const k in ml.books) dropBook(ml.books[k]);
  for (const k in ml.sheets) {
    const S = ml.sheets[k];
    for (const t of S.tex) { try { t.destroy(false); } catch (e) { /* gone */ } }
    for (const r of S.residue) if (r) dropResidue(r);
  }
  ml.sheets = Object.create(null);
  _stats.looksFreed++; _stats.looks = _mlooks.size;
}
let _sweepAt = 0, _sweepTimer = null;
function sweep(now) {
  if (now < _sweepAt) return;
  _sweepAt = now + SWEEP_MS;
  for (const ml of [..._mlooks.values()]) if (now - ml.used >= IDLE_MS) freeMlook(ml);
}
/* on its own clock too: once no armoured figure is drawn, nothing else would
   ask (the last armoured player walked away) */
function sweepSoon() {
  if (_sweepTimer || typeof setInterval !== 'function') return;
  _sweepTimer = setInterval(() => {
    sweep(typeof performance !== 'undefined' ? performance.now() : Date.now());
    if (!_mlooks.size) { clearInterval(_sweepTimer); _sweepTimer = null; }
  }, SWEEP_MS);
}
function dropResidue(t) {
  _stats.residues--; _stats.residueBytes -= t._btBytes || 0;
  try { const bm = t.source && t.source.resource; t.destroy(true); if (bm && bm.close) bm.close(); } catch (e) { /* gone */ }
}

/* the sheets the worker has (it keeps them for the page's life) */
const _sent = new Set();
/** The bytes of a body sheet, once per worker (null: it has them). */
export function lookSheetForWorker(sheetKey, worker) {
  const k = sheetKey;
  if (worker && worker._btLookSent && worker._btLookSent.has(k)) return null;
  const [set, sheet] = sheetKey.split('/');
  const d = lookSheetBytes(set, sheet);
  if (!d) return null;
  if (worker) (worker._btLookSent || (worker._btLookSent = new Set())).add(k);
  _sent.add(k);
  return { type: 'lookSheet', key: k, bytes: d.bytes, w: d.w, rows: d.rows, bits: d.bits };
}

/**
 * The body's frame under armour, from the numbers: { tex, residue } once the
 * bake has decided it, else null (and the bake asked for, at `rank`).
 *   entries   the look's row entries (playerSkins.getLookBodyEntries) -- the
 *             art's own look too, which the bare body draws from its shipped
 *             sheet but whose masked frames were copies like any other's
 *   worn      [{ k: 'chest:steelplate', tex }] the gear frames, as the old path's
 *   poseInfo  { pose, dir, frameIdx }
 * Null too when this cannot be drawn so (no row, no room for a book): then
 * `fallback` is set on the answer object `why` for the caller's old path.
 */
export function lookArmourFrame(entries, worn, poseInfo, rank, why) {
  if (!entries || !lookArmourOn() || !_baker) { if (why) why.fallback = true; return null; }
  const look = lookOf(entries);
  const sheet = poseInfo.pose + '-' + poseInfo.dir;
  const lay = lookMaskLayout('body', sheet), sh = lookSheetOf('body', sheet);
  if (!lay || !sh) { if (why) why.fallback = true; return null; }
  const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const ml = mlookFor(look, worn.map((w) => w.k).join(','), now);
  if (!ml) { if (why) why.fallback = true; return null; }
  sweep(now);
  const book = bookFor(ml, lay);
  if (!book) { if (why) why.fallback = true; return null; }
  let S = ml.sheets[sheet];
  if (!S) {
    S = ml.sheets[sheet] = { state: new Uint8Array(sh.frames.length), tex: [], residue: new Array(sh.frames.length).fill(null), jobs: [] };
    S.tex = sh.frames.map((f) => {
      const t = new Texture({ source: sh.src, frame: f.frame, orig: f.orig, trim: f.trim });
      t._btLook = ml;
      t.__btIx = f.i; t.__btN = f.n;
      return t;
    });
  }
  const n = S.tex.length;
  const f = ((poseInfo.frameIdx % n) + n) % n;
  if (S.state[f] === 2) return { tex: S.tex[f], residue: S.residue[f] };
  if (S.state[f] === 0) ask(ml, S, lay, sh, sheet, f, worn, poseInfo, rank);
  else if (rank > 0 && S.jobs[f] && S.jobs[f].raise) S.jobs[f].raise(rank);
  return null;
}
/** Ask for a frame behind the loading screen (or in the background): resolves
 *  once it is decided, failed, or cannot be drawn so. */
export function lookArmourPrewarm(entries, worn, poseInfo) {
  const why = {};
  if (lookArmourFrame(entries, worn, poseInfo, 0, why) || why.fallback) return Promise.resolve();
  const ml = _mlooks.get(lookOf(entries).key + '|' + worn.map((w) => w.k).join(','));
  const S = ml && ml.sheets[poseInfo.pose + '-' + poseInfo.dir];
  const n = S ? S.tex.length : 1;
  const job = S && S.jobs[((poseInfo.frameIdx % n) + n) % n];
  return Promise.resolve(job && job.done).then(() => {}, () => {});
}
/** QA: the job lookArmourFrame would send for this frame (mp-lookarmour's reference), or null. */
export function lookArmourJob(entries, worn, poseInfo) {
  const sheet = poseInfo.pose + '-' + poseInfo.dir;
  const sh = lookSheetOf('body', sheet);
  if (!entries || !sh) return null;
  const n = sh.frames.length, f = ((poseInfo.frameIdx % n) + n) % n, fr = sh.frames[f];
  const cell = {
    x: fr.frame.x, y: fr.frame.y, w: fr.frame.width, h: fr.frame.height,
    tx: fr.trim ? fr.trim.x : 0, ty: fr.trim ? fr.trim.y : 0,
    ow: fr.orig ? fr.orig.width : fr.frame.width, oh: fr.orig ? fr.orig.height : fr.frame.height,
  };
  return { look: { sheet: 'body/' + sheet, cell, row: baseRow(lookOf(entries)) }, worn, poseInfo: { pose: poseInfo.pose, dir: poseInfo.dir, frameIdx: f } };
}
/** This frame decided for this look and worn set (QA: __btMaskedCoverage). */
export function lookArmourDecided(entries, wornSig, sheet, f) {
  const ml = entries && _mlooks.get(lookOf(entries).key + '|' + wornSig);
  const S = ml && ml.sheets[sheet];
  return !!S && S.state[((f % S.state.length) + S.state.length) % S.state.length] === 2;
}
/** True once every frame of these sheets is decided for this look and set (the loading screen waits on it). */
export function lookArmourReady(entries, wornSig, sheet) {
  const ml = entries && _mlooks.get(lookOf(entries).key + '|' + wornSig);
  const S = ml && ml.sheets[sheet];
  return !!S && S.state.every((v) => v === 2);
}

function ask(ml, S, lay, sh, sheet, f, worn, poseInfo, rank) {
  S.state[f] = 1;
  _stats.framesAsked++;
  const fr = sh.frames[f];
  const cell = {
    x: fr.frame.x, y: fr.frame.y, w: fr.frame.width, h: fr.frame.height,
    tx: fr.trim ? fr.trim.x : 0, ty: fr.trim ? fr.trim.y : 0,
    ow: fr.orig ? fr.orig.width : fr.frame.width, oh: fr.orig ? fr.orig.height : fr.frame.height,
  };
  const job = _baker({ look: { sheet: 'body/' + sheet, cell, row: ml.rgba.slice(0, 256 * 4) }, worn, poseInfo: { pose: poseInfo.pose, dir: poseInfo.dir, frameIdx: f }, rank, key: ml.key + '|' + sheet + '#' + f });
  S.jobs[f] = job;
  Promise.resolve(job && job.done).then((reply) => {
    S.jobs[f] = null;
    if (!_mlooks.has(ml.key) || ml.sheets[sheet] !== S) return;   /* let go of meanwhile */
    if (!reply || reply.err || reply.beltPending || (!reply.show && !reply.raw)) { S.state[f] = 0; _stats.framesFailed++; return; }
    const book = ml.books[lay.pose];
    if (!book) { S.state[f] = 0; return; }
    /* the cell's bits, at their place in the sheet's display (raw: the bake
       had no body yet -- the whole frame shows, as the old path drew it) */
    const base = lay.row * MASK_W * 8;
    for (let y = 0; y < cell.h; y++) {
      for (let x = 0; x < cell.w; x++) {
        const a = base + (cell.y + y) * lay.dw + cell.x + x;
        const on = reply.raw ? 1 : reply.show[y * cell.w + x];
        if (on) book.bytes[a >> 3] |= (1 << (a & 7)); else book.bytes[a >> 3] &= ~(1 << (a & 7));
      }
    }
    book.dirty = true;
    /* the book's rows the cell's bits are in */
    const a0 = base + cell.y * lay.dw + cell.x, a1 = base + (cell.y + cell.h - 1) * lay.dw + cell.x + cell.w;
    book.lo = Math.min(book.lo, Math.floor((a0 >> 3) / MASK_W)); book.hi = Math.max(book.hi, Math.min(book.rows, Math.floor((a1 >> 3) / MASK_W) + 1));
    atlasChanged();
    if (reply.residue && reply.residue.bitmap) {
      const r = reply.residue;
      const src = new ImageSource({ resource: r.bitmap, scaleMode: 'linear', autoGenerateMipmaps: true, alphaMode: 'premultiply-alpha-on-upload', autoGarbageCollect: false, label: 'bt-look-residue' });
      const t = new Texture({ source: src, frame: new Rectangle(0, 0, r.w, r.h), orig: new Rectangle(0, 0, cell.ow, cell.oh), trim: new Rectangle(r.x, r.y, r.w, r.h) });
      t._btBytes = r.w * r.h * 4;
      if (S.residue[f]) dropResidue(S.residue[f]);
      S.residue[f] = t;
      _stats.residues++; _stats.residueBytes += t._btBytes;
    }
    if (reply.counts) for (const k of ['keep', 'near', 'clear', 'other', 'otherNew', 'otherAlpha', 'otherColour']) _stats[k] = (_stats[k] || 0) + (reply.counts[k] || 0);
    if (reply.counts && reply.counts.maxNear > _stats.maxNear) _stats.maxNear = reply.counts.maxNear;
    S.state[f] = 2;
    _stats.framesDone++;
  }, () => { S.state[f] = 0; _stats.framesFailed++; });
}

/* QA probe, house style */
if (typeof window !== 'undefined') {
  window.__btLookArmour = () => {
    let bookBytes = 0;
    for (const b of _books) bookBytes += b.bytes ? b.bytes.length : 0;
    return { on: lookArmourOn(), ..._stats, looks: _mlooks.size, rows: [..._mlooks.values()].filter((m) => m.row >= 0).length,
      bookKB: +(bookBytes / 1024).toFixed(1), atlasMB: +(MASK_W * _rows / 1048576).toFixed(2), sheetsSent: [..._sent] };
  };
}
