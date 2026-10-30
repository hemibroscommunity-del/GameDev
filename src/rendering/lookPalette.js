/* ═══ v2.3.3716: THE BODY KEPT ONCE, COLOURED ON THE GRAPHICS CHIP BY ITS LOOK ═══
 *
 * The owner: "The game needs to be extremely memory efficient."  Every look --
 * a skin, trousers, boots, an eye colour -- gets its own recoloured copy of the
 * body's sheets today (playerSkins.js recolorBodyToCanvas): a phone with
 * twenty differently dressed players on it holds twenty copies of the walking
 * body, ~5.8 MB on the graphics chip each, and the old path never lets one go.
 * This keeps each stand and jog sheet ONCE, as colour numbers, and colours it
 * as it is drawn: a look is one ROW of role colours (1 KB) in paletteTex.js's
 * atlas, freed when no one has worn it for a while.
 *
 * ON by default since the owner's word (below); `?lookpalette=0` in the
 * address is the old path, exactly as before, for that page.  The plan for the rest -- every pose, the shirts,
 * the armour and the body under it, the head pieces -- is
 * docs/specs/look-palette.md.
 *
 * WHAT A SHEET IS (tools/art/role-bake.mjs makes them, public/sprites/look/):
 * one RG8 texture (two bytes a texel):
 *   rows [0, n)   a 16-bit colour NUMBER a texel: the jog sheets one a DISPLAY
 *                 texel (ds 1, laid out cell for cell as the old path's packed
 *                 sheet), the stand sheets one a SOURCE pixel, four to a display
 *                 texel (ds 2: the old path shrinks the 256 stand art by a 2x2
 *                 box -- measured, Chromium's 'high' halving IS that box), so
 *                 the four are coloured and averaged here as the canvas did;
 *   then          its TABLE, two texels an entry: the art's own colour,
 *                 straight (r, g | b, a), entries sorted by ROLE;
 *   last row      its header: ds, n, the table's first row, and where each
 *                 role's entries end.
 * The ROLES (the bake decides them by running the game's own recolour):
 *   0 keep, 1 skin, 2 trousers, 3 boots, 4-7 an iris over roles 0-3.
 * A LOOK'S ROW: entry 1 the skin's target, 2 the trousers', 3 the boots', 4
 * the eye's, each (r, g, b, 255) or all 0 for "as drawn".  The shader is
 * recolorBodyToCanvas's own arithmetic: min(255, round(target x luminance /
 * ref)) with the refs 149 / 112 / 75, the iris replaced by the eye colour, the
 * result premultiplied as the canvas keeps it.
 *
 * HOW IT IS SAMPLED: the body is drawn with sharpPixels.js's "sharp" read (or
 * Pixi's plain one, `?sharp=0`) from a mipmapped texture.  A texture of
 * numbers cannot be filtered by the chip, so the shader does it: the four
 * display texels round the point, each coloured, blended with the chip's own
 * weights; minified, the mip chain's first level (a 2x2 box of display
 * texels, which is what the chip's own mipmaps are) and the blend between
 * them.  Below half size it stays on that level (the chip would go deeper):
 * docs/specs/look-palette.md.
 *
 * DRAWN BY ITS OWN BATCHER, LOOK_BATCHER, routed by the texture as
 * paletteTex.js routes its own (BatcherPipe.addToBatch, inside sharpPixels'
 * hook): the slot, the look's row and the sharp flag ride in the vertex's
 * texture id (slot + 16 x (2 x (row + 1) + sharp)).  Every batch binds the
 * atlas after its pictures.
 *
 * Probe: window.__btLookPalette().
 */
import { BatcherPipe, DefaultBatcher, ExtensionType, extensions, BufferImageSource, Texture, Rectangle, Sprite, Container, GlProgram, Shader, UniformGroup, SpritePipe, glUploadBufferImageResource } from 'pixi.js';
import { paletteAtlasSource, takePaletteRow, givePaletteRow, paletteRendererOf } from './paletteTex.js';
import { clientOff } from '../game/clientOff.js';   /* v2.3.3716: the Test panel's live off switch (lane D's clientOff.js) */
import { lookPaletteChoice } from '../game/lookPaletteChoice.js';   /* v2.3.3838: not built on Windows */

export const LOOK_BATCHER = 'bt-look';
const SLOTS = 4;                  /* sheets a batch (a figure draws one); the atlas is the unit after */
const IDLE_MS = 30000;            /* a look no one drew for this long gives its row back */
const SWEEP_MS = 5000;

/* ── the switch ── */
/* v2.3.3716: ON by default -- the owner, 2026-10-28: "I think including the
   new memory change work by default would be better. I can always revert the
   change if I don't like it or it doesn't work well."  `?lookpalette=0` is the
   old path, for one page. */
/* v2.3.3838: and not on Windows, whose shader compiler takes minutes over this
   program -- the loading screen froze at 75% for 5-10 minutes on the owner's
   laptop, Chrome and Firefox both (game/lookPaletteChoice.js has the why);
   `?lookpalette=1` builds it anyway.  v2.3.3842: and not on a Mac (ANGLE's
   Metal inlines too; nothing measured it before the judges) */
let _why = 'default';
function wantedByAddress() {
  try {
    const nav = typeof navigator !== 'undefined' ? navigator : null;
    const c = lookPaletteChoice(window.location.search || '', nav && nav.userAgent, nav && nav.userAgentData && nav.userAgentData.platform,
      nav && nav.maxTouchPoints);   /* v2.3.3842: a Mac too (an iPad, with touch, keeps it) */
    _why = c.why;
    return c.on;
  } catch (e) { return true; }
}
const _wanted = wantedByAddress();
/** The body's stand and jog drawn from the numbers (`?lookpalette=0`: not). */
export function lookPaletteWanted() { return _wanted; }

/* ═══ v2.3.3737: SETS, REGISTERED BY THEIR MANIFESTS (phase 2's seam) ═══
   Each part kept as numbers -- the body, a pose family, the shirts, the
   armour, the head pieces -- is a SET: its own manifest and folder
   (public/sprites/look/<set>/, tools/art/role-bake.mjs --set), registered
   here by name, so a lane adds its part without editing this file:

     registerLookSheets('hats', '/sprites/look/hats/roles.json')

   A manifest says, as DATA: its sheets (by name, e.g. 'hit-east' -- a pose
   is the sheets it has, nothing in this file lists them), their scale (ds),
   bits (8 or 16 a number), and its ROLES: what each role does with which
   entry of a look's row (docs/specs/look-palette.md, "The row is law").
   The body is the set 'body' (roles.json at the folder's root, v2.3.3716). */
const _sets = new Map();          /* name -> { url, base, manifest, loading } */
const _sheets = Object.create(null);   /* 'body/jog-east' -> { src, frames: [{frame, trim}], ds, bits } */
let _loading = null;
let _ok = null;                   /* the program: null not tried, true linked, false not here */
const _stats = { sheets: 0, sheetBytes: 0, looksMade: 0, looksFreed: 0, rowsFull: 0, linkError: null, loadError: null, drawn: 0, sets: 0, rangeErrors: 0, remade: 0, remadeInFrame: 0 };

/* the body's roles, as v2.3.3716 baked them (its manifest predates `roles`):
   1 skin, 2 trousers, 3 boots retinted by luminance over their refs; 4-7 an
   iris (row entry 4, replaced) over roles 0-3 when no eye colour is picked */
const BODY_ROLES = Object.freeze([
  { name: 'skin', entry: 1, ref: 149, under: 0 },
  { name: 'pants', entry: 2, ref: 112, under: 0 },
  { name: 'boots', entry: 3, ref: 75, under: 0 },
  { name: 'iris', entry: 4, ref: 0, under: 0 },
  { name: 'iris-skin', entry: 4, ref: 0, under: 1 },
  { name: 'iris-pants', entry: 4, ref: 0, under: 2 },
  { name: 'iris-boots', entry: 4, ref: 0, under: 3 },
]);
/* THE ROW IS LAW (look-palette.md): which entries of a look's row each kind
   of part may use, so the parts of one player can share one row later */
export const LOOK_ROW_RANGES = Object.freeze({ body: [0, 7], shirt: [8, 31], armour: [32, 63], head: [64, 127], 'shirt-drawing': [128, 159], spare: [160, 255] });
/* a kind's number in the header (the shader's per-kind hook, registerLookKind) */
export const LOOK_KIND_IDS = Object.freeze({ body: 0, shirt: 1, armour: 2, head: 3, 'shirt-drawing': 4 });
const MAX_ROLES = 15;
/* the header's 16-bit values: 0 scale (| 128 for 8 bits), 1 number rows, 2
   the table's first row, 3 bits, 4 roles, 5-20 each role's end, 21-65 each
   role's entry / ref / under, 66 the refs' scale (ref / refScale, P4's
   fractional refs), 67 the kind (LOOK_KIND_IDS), 68-69 the sheet's offset in
   a book (P3's masks, setLookSheetBook), low and high */
const HEAD_VALUES = 5 + 16 + 3 * MAX_ROLES + 4;

function webgl2(r) { return !!(r && r.gl && r.context && r.context.webGLVersion === 2); }
/** Drawn from the numbers here: wanted, the sheets in, WebGL2, the program not refused. */
export function lookPaletteOn() {
  /* clientOff: "Characters coloured on the chip" off for every phone, live,
     from the Test panel -- the body is then drawn the old way (a copy baked
     for each look on first sight, as before) */
  return _wanted && _ok !== false && _stats.sheets > 0 && webgl2(paletteRendererOf()) && !clientOff('lookpalette');
}
/** v2.3.3753: a loaded set's manifest (its sheets, their facings, its
 *  entries), or null -- one fetch of it, shared (headLook.js reads it). */
export function lookManifest(set) { const s = _sets.get(set); return (s && s.manifest) || null; }
/** This set has this sheet in numbers (loaded). */
export function lookHas(set, sheet) { return !!_sheets[set + '/' + sheet]; }
/** The body has sheets of numbers for this pose (whatever its manifest lists). */
export function lookPose(pose) {
  const s = _sets.get('body');
  const m = s && s.manifest;
  if (!m) return false;
  for (const k in m.sheets) if (k.slice(0, pose.length + 1) === pose + '-') return true;
  return false;
}

/* ═══ THE SHEETS ═══ */
function loadPng(url) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error('no ' + url));
    im.src = url;
  });
}
function buildSheet(set, name, m, img, roles) {
  const W = m.w, n = m.h, T = m.tableRows, E = m.entries;
  const bits = m.bits === 8 ? 8 : 16;
  const bpt = bits === 8 ? 1 : 2;            /* bytes a texel */
  if (img.naturalWidth !== W || img.naturalHeight !== n + T) throw new Error(name + ': ' + img.naturalWidth + 'x' + img.naturalHeight);
  if (roles.length > MAX_ROLES) throw new Error(name + ': ' + roles.length + ' roles, ' + MAX_ROLES + ' at most');
  /* the table: two RG texels an entry (16 bits), four R texels (8 bits);
     the header in the last row(s); the stand's texture (resolution 2) an
     even number of rows */
  const tRows = Math.ceil((E * 4 / bpt) / W);
  const hRows = Math.ceil((HEAD_VALUES * 2 / bpt) / W);
  let rows = n + tRows + hRows;
  if (m.ds === 2 && (rows & 1)) rows++;
  const head = new Array(HEAD_VALUES).fill(0);
  head[0] = m.ds | (bits === 8 ? 128 : 0) | (m.mip === false ? 64 : 0);   /* v2.3.3757: 64, a sheet drawn without mipmaps (the stand-ins) */ head[1] = n; head[2] = n; head[3] = bits; head[4] = roles.length;
  const ends = m.ends || [];
  for (let r = 0; r < 16; r++) head[5 + r] = ends[Math.min(r, ends.length - 1)] != null ? ends[Math.min(r, ends.length - 1)] : E;
  roles.forEach((ro, i) => { head[21 + 3 * i] = ro.entry; head[22 + 3 * i] = Math.round(ro.ref || 0); head[23 + 3 * i] = ro.under || 0; });
  head[66] = Math.max(1, Math.round(m.refScale || 1));
  head[67] = LOOK_KIND_IDS[m.kind] || 0;
  /* the PNG is opaque, so it decodes exactly: a number in red (and green, 16
     bits), the table two pixels an entry, (r, g) then (b, a) -- made again
     from the <img> whenever the chip needs them (the bytes are let go of
     once uploaded) */
  const holder = { sheet: null };
  const make = () => {
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = n + T;
    const g = cv.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    const px = g.getImageData(0, 0, W, n + T).data;
    cv.width = 0; cv.height = 0;   /* Safari: hand the backing store back now */
    const out = new Uint8Array(W * rows * bpt);
    for (let q = 0; q < W * n; q++) { out[q * bpt] = px[q * 4]; if (bpt === 2) out[q * 2 + 1] = px[q * 4 + 1]; }
    const t0 = W * n * bpt;
    for (let e = 0; e < E; e++) {
      const s = (W * n + 2 * e) * 4;
      out.set([px[s], px[s + 1], px[s + 4], px[s + 5]], t0 + e * 4);
    }
    const put = (i, v) => {
      for (let b = 0; b < (bits === 8 ? 2 : 1); b++) {
        const p = i * (bits === 8 ? 2 : 1) + b, x = p % W, y = rows - 1 - Math.floor(p / W);
        if (bits === 8) out[y * W + x] = b ? (v >> 8) & 255 : v & 255;
        else { out[(y * W + x) * 2] = v & 255; out[(y * W + x) * 2 + 1] = (v >> 8) & 255; }
      }
    };
    const book = (holder.sheet && holder.sheet.book) || 0;
    head[68] = book & 65535; head[69] = Math.floor(book / 65536) & 65535;
    head.forEach((v, i) => put(i, v));
    return out;
  };
  const data = make();
  const src = new BufferImageSource({
    resource: data, width: W / m.ds, height: rows / m.ds, resolution: m.ds,
    format: bits === 8 ? 'r8unorm' : 'rg8unorm', scaleMode: 'nearest', alphaMode: 'premultiplied-alpha',
    autoGenerateMipmaps: false, autoGarbageCollect: false, label: 'bt-look:' + (set === 'body' ? '' : set + '/') + name,
  });
  src._btLook = { ds: m.ds, w: W, rows, bits, make, n };
  const frames = m.cells.map(([ax, ay, tx, ty, w, h], i) => {
    const r = { i, n: m.cells.length };
    /* in display texels, which are the source's points (a ds 2 sheet is
       resolution 2): the old path's own cells */
    if (tx < 0) r.frame = new Rectangle(ax, ay, w, h);
    else { r.frame = new Rectangle(ax, ay, w, h); r.orig = new Rectangle(0, 0, m.fw || 128, m.fh || 128); r.trim = new Rectangle(tx, ty, w, h); }
    return r;
  });
  const sheetRec = { src, frames, ds: m.ds, bits, book: 0, uploaded: -1 };
  holder.sheet = sheetRec;
  _sheets[set + '/' + name] = sheetRec;
  _stats.sheets++;
  _stats.sheetBytes += data.length;
}
async function loadSet(name) {
  const s = _sets.get(name);
  if (!s || s.loading) return s ? s.loading : false;
  s.loading = (async () => {
    try {
      const v = 'v2.3.3737';
      const res = await fetch(s.url + '?v=' + v);
      if (!res.ok) throw new Error(s.url + ' ' + res.status);
      const m = await res.json();
      const roles = m.roleDefs || (name === 'body' ? BODY_ROLES : []);   /* (a manifest's `roles` is its roles' names) */
      /* the row is law: a set's roles stay inside its kind's entries */
      const range = m.kind && LOOK_ROW_RANGES[m.kind];
      if (range && roles.some((ro) => ro.entry < range[0] || ro.entry > range[1])) { _stats.rangeErrors++; throw new Error(name + ': a role outside the ' + m.kind + ' entries ' + range.join('-')); }
      await Promise.all(Object.keys(m.sheets).map(async (sheet) => {
        const e = m.sheets[sheet];
        const img = await loadPng(s.base + sheet + '.png?v=' + v + '.' + (e.art || ''));
        buildSheet(name, sheet, { bits: m.bits, fw: m.fw, fh: m.fh, refScale: m.refScale, kind: m.kind, mip: m.mip, ...e }, img, e.roleDefs || roles);
      }));
      s.manifest = m;
      _stats.sets++;
      prewarmProgram();
      uploadSheets();
      return true;
    } catch (e) {
      _stats.loadError = String((e && e.message) || e);
      for (const k of Object.keys(_sheets)) {
        if (k.slice(0, name.length + 1) !== name + '/') continue;
        try { _sheets[k].src.destroy(); } catch (er) { /* gone */ }
        delete _sheets[k];
        _stats.sheets--;
      }
      return false;
    }
  })();
  return s.loading;
}
/* ═══ v2.3.3752 (P3): THE ARMOUR'S MASKS (lookArmour.js) ═══
   Under armour a body sheet shows only the display texels the masked bake
   kept: a bit a texel, in a book of its pose in one R8 atlas MASK_W bytes
   wide, bound after the palette atlas.  The sheet's book offset (68-69,
   setLookSheetBook) is its pose's index << 16 | its first row in the book + 1;
   the masked look's row entry 32 + the pose's index holds the book's first
   atlas row (lookShown in the program). */
export const MASK_W = 2048;
let _maskSource = null;
/** lookArmour.js gives the mask atlas's source (null: none yet, a blank is bound). */
export function setLookMaskSource(fn) { _maskSource = fn; }
/** A set's sheet names in its manifest's own order (null while it loads). */
export function lookSetSheets(set) { const s = _sets.get(set); return s && s.manifest ? Object.keys(s.manifest.sheets) : null; }
/** A sheet's source and frames (lookArmour.js builds its masked frames over them). */
export function lookSheetOf(set, sheet) { return _sheets[set + '/' + sheet] || null; }
/** A sheet's numbers, table and header as the chip gets them (made again from
 *  its <img>), for the bake to colour a frame on the CPU (lookExpand.js). */
export function lookSheetBytes(set, sheet) {
  const sh = _sheets[set + '/' + sheet];
  if (!sh || !sh.src._btLook) return null;
  const L = sh.src._btLook;
  return { bytes: L.make(), w: L.w, rows: L.rows, ds: L.ds, bits: L.bits, n: L.n };
}
/** v2.3.3737 (P3): a sheet's offset in its book of masks, in the header
 *  (68-69) for the shader -- uploaded again with it. */
export function setLookSheetBook(set, sheet, offset) {
  const sh = _sheets[set + '/' + sheet];
  if (!sh || sh.book === offset) return !!sh;
  sh.book = offset >>> 0;
  try { sh.src.update(); } catch (e) { /* uploaded with it when next drawn */ }
  return true;
}
/* every sheet on the chip, and its bytes let go of (the upload): a sheet
   first drawn only when someone wears a look held its bytes in the page
   until then -- measured, the memory check's phone (the default look) read
   23.0 MB of buffers at home against 20.3 with `?lookpalette=0`.  As the
   Wheel's ground does (wheelGround.js _toGpu); a context that is lost
   uploads as it is first drawn instead. */
let _inPrewarm = false;
function uploadSheets() {
  const r = paletteRendererOf();
  if (!r || !webgl2(r) || !r.texture || typeof r.texture.initSource !== 'function') return;
  const gl = r.gl;
  if (gl && typeof gl.isContextLost === 'function' && gl.isContextLost()) return;
  for (const k of Object.keys(_sheets)) {
    const sh = _sheets[k];
    /* v2.3.3883: on THIS renderer -- a black screen's rebuild is a new one,
       and a true here from the old one sent nothing to it: every sheet was
       then made again from its <img> inside the first frames drawn
       (`remadeInFrame`), not behind the rebuild's wait (the renderer's uid,
       not the renderer: a destroyed one is not kept) */
    if (sh.uploaded === r.uid) continue;
    try { _inPrewarm = true; r.texture.initSource(sh.src); sh.uploaded = r.uid; } catch (e) { /* drawn the usual way */ } finally { _inPrewarm = false; }
  }
}
/**
 * v2.3.3737: a set of colour-number sheets, by its manifest's address
 * (`/sprites/look/<set>/roles.json`).  Loaded with the rest behind the
 * loading screen (preloadLookSheets) -- or at once, if that has already run:
 * the promise says when (await it behind your own loading screen).
 */
export function registerLookSheets(name, manifestUrl) {
  if (!_wanted) return Promise.resolve(false);
  if (!_sets.has(name)) _sets.set(name, { url: manifestUrl, base: manifestUrl.replace(/[^/]*$/, ''), manifest: null, loading: null });
  return _loading ? loadSet(name) : Promise.resolve(true);
}
registerLookSheets('body', '/sprites/look/roles.json');
/** The sheets, behind the loading screen (playerSkins.preloadBodyAll awaits
 *  this) -- and the program built there once a renderer exists.  Resolves
 *  whatever happens: a set that fails is drawn the old way. */
export function preloadLookSheets() {
  if (!_wanted) return Promise.resolve(false);
  prewarmProgram();
  if (!_loading) _loading = Promise.all([..._sets.keys()].map(loadSet)).then((r) => r.every(Boolean));
  return _loading;
}

/* ═══ THE LOOKS ═══ */
const _looks = new Map();          /* key -> look */
const tkey = (t) => (t ? t[0] + ',' + t[1] + ',' + t[2] + (t.length > 3 ? ',' + t[3] : '') : '-');   /* v2.3.3737: + an RGBA entry's fourth byte */
function lookRow(look) {
  const rgba = new Uint8Array(256 * 4);
  /* v2.3.3737 (P2): a four-byte value is an RGBA entry verbatim (a shirt's
     ink bits, a drawing's cells); three bytes are a colour, alpha 255 */
  for (const [e, t] of look.entries) if (t) rgba.set(t.length > 3 ? [t[0], t[1], t[2], t[3]] : [t[0], t[1], t[2], 255], e * 4);
  return rgba;
}
let _sweepAt = 0;
function sweep(now) {
  if (now < _sweepAt) return;
  _sweepAt = now + SWEEP_MS;
  for (const [k, look] of _looks) {
    if (now - look.used < IDLE_MS) continue;
    /* a sprite still holding one of its textures (a player off screen, not
       drawn) draws the art's own colours until it is given a frame again:
       the row may already be another look's */
    look.row = -1;
    givePaletteRow(look.rowHeld);
    /* its frames let go of the sheet (a Texture listens to its source's
       resize, so one dropped without this stays reachable from the sheet
       forever: a look a player who passed by) -- the sheet itself stays */
    for (const k of Object.keys(look.tex)) for (const t of look.tex[k]) { try { t.destroy(false); } catch (e) { /* gone */ } }
    look.tex = Object.create(null);
    look.rowHeld = -1;
    _looks.delete(k);
    _stats.looksFreed++;
  }
}
/**
 * v2.3.3737: a frame of any set's sheet drawn in a look, or null (the switch
 * off, the set not in, every entry the art's own, or no atlas row free: the
 * caller draws the old way).  `entries`: [[rowEntry, [r, g, b] | null], ...]
 * in the set's own range of the row (LOOK_ROW_RANGES).
 */
function lookFrames(set, sheet, entries, opts) {
  if (!lookPaletteOn()) return null;
  if (_ok === null) prewarmProgram();   /* not built behind the loading screen (no renderer then): now */
  if (!entries.some((e) => e[1])) return null;
  const sh = _sheets[set + '/' + sheet];
  if (!sh) return null;
  /* v2.3.3737 (P2): `opts.key` -- the caller's own key for these entries
     (a printed shirt's ~55, not joined every frame); `opts.mirror` -- the
     flipped facings' frames, a texture list of their own, the flag to the
     shader (a print pre-flipped there, as the old path's 'm' bake) */
  const key = (opts && opts.key) || entries.map((e) => e[0] + ':' + tkey(e[1])).join('/');
  const mirror = !!(opts && opts.mirror);
  const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  let look = _looks.get(key);
  if (!look) {
    look = { key, entries, row: -1, rowHeld: -1, used: now, tex: Object.create(null) };
    const row = takePaletteRow(lookRow(look));
    if (row < 0) { _stats.rowsFull++; return null; }
    look.row = row; look.rowHeld = row;
    _looks.set(key, look);
    _stats.looksMade++;
  }
  look.used = now;
  sweep(now);
  const name = set + '/' + sheet + (mirror ? '#m' : '');
  let list = look.tex[name];
  if (!list) {
    list = look.tex[name] = sh.frames.map((f) => {
      const t = new Texture({ source: sh.src, frame: f.frame, orig: f.orig, trim: f.trim });
      t._btLook = look;
      t._btLookMirror = mirror;
      t.__btIx = f.i; t.__btN = f.n;
      return t;
    });
  }
  return list;
}
export function getLookPartFrame(set, sheet, frameIdx, entries, opts) {
  const list = lookFrames(set, sheet, entries, opts);
  return list ? list[((frameIdx % list.length) + list.length) % list.length] : null;
}
/**
 * v2.3.3737 (P1's stand-ins): every frame of a sheet in a look, for a caller
 * that indexes the whole strip -- the same options.  Ask again each time it
 * is drawn: a look nobody asks for in 30 s gives its row and frames back.
 */
export function getLookPartFrames(set, sheet, entries, opts) {
  return lookFrames(set, sheet, entries, opts);
}
/**
 * The body's frame of a pose (any pose its manifest has) in this look, or
 * null.  Targets as playerSkins resolves them ([r, g, b] or null), the eye's
 * only on a sheet with an eye.
 */
export function getLookFrame(pose, dir, frameIdx, skinT, pantsT, shoesT, eyeT) {
  return getLookPartFrame('body', pose + '-' + dir, frameIdx, [[1, skinT], [2, pantsT], [3, shoesT], [4, eyeT]]);
}

/* ═══ THE SHADER ═══ */
/* v2.3.3864: the texture's place, vUV, is HIGHP on both sides.  Pixi gives a
   fragment shader `precision mediump float` unless asked (ensurePrecision), and
   every variable here but that one varying was already highp -- on an iPhone,
   whose chip keeps mediump at 16 bits, the sheet's place came in rounded to
   1/2048 of the sheet (a texel and more on the wide ones) and its slopes (the
   sharp read's scale, the mip level) from that.  The owner, 2026-10-29: the
   body vanished on their phone facing N, NW, W and SW.  Not reproduced on this
   box (its software chip runs mediump at 32 bits), so this is the cheap
   robustness half, not a proven cause: WebGL2 guarantees highp in a fragment
   shader, and where the chip already ran 32 bits nothing changes. */
const VERT = `#version 300 es
in vec2 aPosition;
in vec2 aUV;
in vec4 aColor;
in vec2 aTextureIdAndRound;
out vec4 vColor;
out highp vec2 vUV;
flat out float vTextureId;
flat out float vLook;
flat out float vSharp;
flat out float vMirror;
uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform vec4 uWorldColorAlpha;
uniform vec2 uResolution;
vec2 roundPixels(vec2 position, vec2 targetSize)
{
    return (floor(((position * 0.5 + 0.5) * targetSize) + 0.5) / targetSize) * 2.0 - 1.0;
}
void main(void){
    mat3 worldTransformMatrix = uWorldTransformMatrix;
    mat3 modelMatrix = mat3(
        1.0, 0.0, 0.0,
        0.0, 1.0, 0.0,
        0.0, 0.0, 1.0
      );
    vec2 position = aPosition;
    vec2 uv = aUV;
    vColor = vec4(1.);
    vColor *= vec4(aColor.rgb * aColor.a, aColor.a);
    /* v2.3.3716: the slot and the look (the row + 1; 0: as drawn) */
    float tid = aTextureIdAndRound.y;
    float code = floor(tid / 16.0 + 0.001);
    vTextureId = tid - code * 16.0;
    /* v2.3.3737: slot + 16 x (4 x look + 2 x mirror + sharp) */
    vLook = floor(code / 4.0 + 0.001);
    highp float low = code - vLook * 4.0;
    vMirror = floor(low / 2.0 + 0.001);
    vSharp = low - vMirror * 2.0;
    vUV = uv;
    mat3 modelViewProjectionMatrix = uProjectionMatrix * worldTransformMatrix * modelMatrix;
    gl_Position = vec4((modelViewProjectionMatrix * vec3(position, 1.0)).xy, 0.0, 1.0);
    vColor *= uWorldColorAlpha;
    if(aTextureIdAndRound.x == 1.)
    {
        gl_Position.xy = roundPixels(gl_Position.xy, uResolution);
    }
}
`;

/* ONE copy of the reading below, whichever slot the sprite's sheet is in:
   GLSL ES 3.00 picks a sampler of an array by a constant only, so a chain of
   SLOTS reads is the one place the slot is chosen (fetchT), and every other
   line is written once.  (The first cut wrapped the whole reading in the
   chain, as Pixi's own batch shader does its one read: fifteen inlined copies
   of it, and the software chip this box draws with spent minutes building the
   program behind the loading screen.) */
function fetchChain(fn) {
  const out = [];
  for (let t = 0; t < SLOTS; t++) {
    if (t < SLOTS - 1) out.push(`    ${t > 0 ? 'else ' : ''}if (vTextureId < ${t}.5) return ${fn(t)};`);
    else out.push(`    return ${fn(t)};`);
  }
  return out.join('\n');
}
/* ═══ v2.3.3737: THE PER-KIND HOOK ═══
   A part whose texel is not simply "its entry, recoloured" (a shirt's print,
   P2; an armour's mask, P3; a head piece, P4) registers its own function of
   the texel, by its kind, from its own module -- before the program is built
   (behind the loading screen), so nothing here is edited:

     registerLookKind('shirt', `highp vec4 lookKind_shirt(highp int k, highp ivec2 p) { ... }`)

   It is given the texel's number `k` and its position `p` in the sheet's
   texture, and returns the premultiplied 0-255 colour (entry(k)'s contract).
   It may read: entry(k) (the default), tableRGBA(k) (the entry's own colour,
   straight), num(p), fetchT(p) (the texture, the ONE fetch chain -- never a
   second), rowT(e) (the look's row entry e, 0-255), recol(c, T, ref), and
   sMirror, sBook, sKind, sW, sN, sDs, sBits.  Nothing else in the program
   changes; a kind with no function is drawn by entry(k). */
const _kinds = new Map();   /* kind name -> GLSL */
let _built = false;
export function registerLookKind(kind, glsl) {
  if (LOOK_KIND_IDS[kind] == null) throw new Error('registerLookKind: no kind ' + kind);
  if (_built) { _stats.lateKinds = (_stats.lateKinds || 0) + 1; return false; }
  _kinds.set(kind, glsl);
  return true;
}
function kindDispatch() {
  const out = [];
  for (const [k] of _kinds) out.push(`    if (sKind == ${LOOK_KIND_IDS[k]}) return lookKind_${k.replace(/[^A-Za-z0-9]/g, '_')}(k, p);`);
  return out.join('\n');
}
const fragSource = () => `#version 300 es
in vec4 vColor;
in highp vec2 vUV;
flat in float vTextureId;
flat in float vLook;
flat in float vSharp;
flat in float vMirror;
out vec4 finalColor;
uniform highp sampler2D uTextures[${SLOTS}];
uniform highp sampler2D uPalAtlas;
uniform highp sampler2D uMaskAtlas;
highp vec4 fetchT(highp ivec2 p)
{
${fetchChain((t) => `texelFetch(uTextures[${t}], p, 0)`)}
}
highp ivec2 sizeT()
{
${fetchChain((t) => `textureSize(uTextures[${t}], 0)`)}
}
/* the sheet's header, read once a pixel (lookPalette.js buildSheet): its
   scale, rows, table, bits, and each role's entry of the row, ref and under */
highp int sDs, sN, sW, sT0, sBits, sR, sRefScale, sKind, sBook;
bool sNoMip;   /* v2.3.3757: the old texture had no mip chain (header byte 0's 64) */
bool sMirror;
highp int sE[16];
highp int sRoE[16], sRoF[16], sRoU[16];
highp ivec2 sDisp;
highp int sRow;
highp int mBase;   /* v2.3.3752: the armour mask's first atlas row for this sheet, -1 none */
/* a number: one R texel (8 bits) or an RG pair of bytes (16) */
highp int num(highp ivec2 p)
{
    highp vec2 v = fetchT(p).rg;
    if (sBits == 8) return int(v.r * 255.0 + 0.5);
    return int(v.r * 255.0 + 0.5) + 256 * int(v.g * 255.0 + 0.5);
}
highp int hdr(highp int i, highp ivec2 sz)
{
    highp int per = sBits == 8 ? 2 : 1;
    highp int p = i * per;
    highp ivec2 a = ivec2(p % sz.x, sz.y - 1 - p / sz.x);
    if (per == 1) return num(a);
    highp int q = p + 1;
    highp ivec2 b = ivec2(q % sz.x, sz.y - 1 - q / sz.x);
    return int(fetchT(a).r * 255.0 + 0.5) + 256 * int(fetchT(b).r * 255.0 + 0.5);
}
void readSheet()
{
    highp ivec2 sz = sizeT();
    /* the form first: the header's first byte is the scale, its top bit set
       for an 8-bit sheet -- the same byte, read the same way, in both forms */
    highp int b0 = int(fetchT(ivec2(0, sz.y - 1)).r * 255.0 + 0.5);
    sBits = b0 >= 128 ? 8 : 16;
    sDs = b0 >= 128 ? b0 - 128 : b0;
    sNoMip = sDs >= 64;
    if (sNoMip) sDs -= 64;
    sN = hdr(1, sz);
    sT0 = hdr(2, sz);
    sR = hdr(4, sz);
    for (int r = 0; r < 16; r++) sE[r] = hdr(5 + r, sz);
    for (int r = 0; r < 15; r++) {
        sRoE[r + 1] = hdr(21 + 3 * r, sz);
        sRoF[r + 1] = hdr(22 + 3 * r, sz);
        sRoU[r + 1] = hdr(23 + 3 * r, sz);
    }
    sRefScale = max(1, hdr(66, sz));
    sKind = hdr(67, sz);
    sBook = hdr(68, sz) + 65536 * hdr(69, sz);
    sW = sz.x;
    sDisp = ivec2(sz.x / sDs, sN / sDs);
}
highp vec4 rowT(highp int e)
{
    return sRow >= 0 ? floor(texelFetch(uPalAtlas, ivec2(e, sRow), 0) * 255.0 + 0.5) : vec4(0.0);
}
/* recolorBodyToCanvas's _retint (a ref: the target at the pixel's luminance
   over it), or the target itself (no ref: painted, as the iris) */
highp vec3 recol(highp vec4 c, highp vec4 T, highp int ref)
{
    if (ref <= 0) return T.rgb;
    highp float lum = (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / (float(ref) / float(sRefScale));   /* v2.3.3737: ref in 1/refScale's (P4's fractional refs; the body's scale is 1) */
    return min(vec3(255.0), floor(T.rgb * lum + 0.5));
}
highp ivec2 tpos(highp int t)
{
    return ivec2(t % sW, sT0 + t / sW);
}
/* entry k's own colour, straight, 0..255 */
highp vec4 tableRGBA(highp int k)
{
    highp vec4 c;
    if (sBits == 8) {
        highp int t = 4 * k;
        c = floor(vec4(fetchT(tpos(t)).r, fetchT(tpos(t + 1)).r, fetchT(tpos(t + 2)).r, fetchT(tpos(t + 3)).r) * 255.0 + 0.5);
    } else {
        highp int t = 2 * k;
        highp ivec2 p = tpos(t);
        c = floor(vec4(fetchT(p).rg, fetchT(p + ivec2(1, 0)).rg) * 255.0 + 0.5);
    }
    return c;
}
/* entry k's colour in this look, premultiplied, 0..255 as the canvas kept it */
highp vec4 entry(highp int k)
{
    if (k == 0) return vec4(0.0);
    highp vec4 c = tableRGBA(k);
    highp int role = 0;
    for (int r = 0; r < 15; r++) if (k >= sE[r]) role = r + 1;
    if (role > 0 && role <= sR) {
        highp vec4 T = rowT(sRoE[role]);
        if (T.a > 0.5) c.rgb = recol(c, T, sRoF[role]);
        else {
            highp int u = sRoU[role];
            if (u > 0) {
                highp vec4 T2 = rowT(sRoE[u]);
                if (T2.a > 0.5) c.rgb = recol(c, T2, sRoF[u]);
            }
        }
    }
    return vec4(floor(c.rgb * c.a / 255.0 + 0.5), c.a);
}
${Array.from(_kinds.values()).join('\n')}
/* a texel's colour: its kind's function (registerLookKind), else its entry */
/* v2.3.3752 (P3): display texel q shown under the armour (the masked bake
   kept it): one bit of the sheet's pose book in the mask atlas (lookArmour.js) */
bool lookShown(highp ivec2 q)
{
    if (mBase < 0) return true;
    highp int a = q.y * sDisp.x + q.x;
    highp int b = a >> 3;
    highp int v = int(texelFetch(uMaskAtlas, ivec2(b % ${MASK_W}, mBase + b / ${MASK_W}), 0).r * 255.0 + 0.5);
    return ((v >> (a & 7)) & 1) == 1;
}
highp vec4 colourAt(highp int k, highp ivec2 p)
{
    if (mBase >= 0 && !lookShown(p / sDs)) return vec4(0.0);
${kindDispatch()}
    return entry(k);
}
/* a display texel: level 0 of the old texture (the stand's: its 2x2 box) */
highp vec4 dispTexel(highp ivec2 q)
{
    q = clamp(q, ivec2(0), sDisp - 1);
    if (sDs == 1) return colourAt(num(q), q);
    highp ivec2 o = q * 2;
    highp int k0 = num(o);
    highp vec4 sum = vec4(0.0);
    bool same = true;
    for (int i = 1; i < 4; i++) {
        highp ivec2 pi = o + ivec2(i & 1, i >> 1);
        highp int k = num(pi);
        if (k != k0) same = false;
        sum += colourAt(k, pi);
    }
    if (same && sKind == 0 && mBase < 0) return entry(k0);
    /* the canvas's 'high' halving: the box of the premultiplied bytes,
       truncated (measured in Chromium) */
    return floor((sum + colourAt(k0, o)) / 4.0);
}
/* a texel of the mip chain's first level: a 2x2 box of display texels */
highp vec4 mipTexel(highp ivec2 q)
{
    q = clamp(q, ivec2(0), (sDisp + 1) / 2 - 1);
    highp vec4 sum = vec4(0.0);
    for (int i = 0; i < 4; i++) sum += dispTexel(q * 2 + ivec2(i & 1, i >> 1));
    return floor(sum / 4.0 + 0.5);
}
highp vec4 bilinear(highp vec2 P, bool level1)
{
    highp vec2 tc = (level1 ? P * 0.5 : P) - 0.5;
    highp vec2 fl = floor(tc);
    highp vec2 f = tc - fl;
    highp ivec2 a = ivec2(fl);
    highp vec4 c[4];
    if (!level1 && sDs == 1) {
        /* the four numbers first: one colour where they are one (most of a
           figure's quad is see-through round it) */
        highp int k[4];
        highp ivec2 pp[4];
        for (int i = 0; i < 4; i++) { pp[i] = clamp(a + ivec2(i & 1, i >> 1), ivec2(0), sDisp - 1); k[i] = num(pp[i]); }
        if (sKind == 0 && mBase < 0 && k[0] == k[1] && k[0] == k[2] && k[0] == k[3]) return entry(k[0]);
        for (int i = 0; i < 4; i++) c[i] = colourAt(k[i], pp[i]);
    } else {
        for (int i = 0; i < 4; i++) c[i] = level1 ? mipTexel(a + ivec2(i & 1, i >> 1)) : dispTexel(a + ivec2(i & 1, i >> 1));
    }
    return mix(mix(c[0], c[1], f.x), mix(c[2], c[3], f.x), f.y);
}
void main(void) {
    highp vec2 dx = dFdx(vUV);
    highp vec2 dy = dFdy(vUV);
    sRow = int(vLook + 0.5) - 1;
    sMirror = vMirror > 0.5;
    readSheet();
    mBase = -1;
    if (sBook > 0 && sRow >= 0) {
        highp vec4 mb = rowT(32 + sBook / 65536);
        if (mb.a > 0.5) mBase = int(mb.r) + 256 * int(mb.g) + (sBook % 65536) - 1;
    }
    /* the body as the chip drew it: sharpPixels.js's sharpSample (or Pixi's
       plain read) on a mipmapped texture, done by hand on the coloured texels */
    highp vec2 ts = vec2(sizeT()) / float(sDs);   /* in display texels */
    highp vec2 px = vUV * ts;
    highp vec2 P = px;
    if (vSharp > 0.5) {
        highp vec2 tpp = vec2(length(vec2(dx.x, dy.x)), length(vec2(dx.y, dy.y))) * ts;
        highp vec2 scale = 1.0 / max(tpp, vec2(1e-4));
        highp vec2 base = floor(px - 0.5) + 0.5;
        highp vec2 f = clamp((px - base - 0.5) * scale + 0.5, 0.0, 1.0);
        P = mix(px, base + f, step(1.0, min(scale.x, scale.y)));
    }
    highp float rho = max(length(dx * ts), length(dy * ts));
    highp float lod = log2(max(rho, 1e-6));
    highp vec4 c = bilinear(P, false);
    /* v2.3.3757: a sheet whose old texture had no mipmaps (the stand-ins'
       canvases) was read at its level 0 however small it was drawn */
    if (lod > 0.0 && !sNoMip) c = mix(c, bilinear(P, true), min(lod, 1.0));
    finalColor = (c / 255.0) * vColor;
}
`;

let _shader = null;
function lookShader() {
  if (_shader) return _shader;
  _built = true;   /* v2.3.3737: the kinds registered by now are the program's */
  const units = new Int32Array(SLOTS);
  for (let i = 0; i < SLOTS; i++) units[i] = i;
  _shader = new Shader({
    glProgram: GlProgram.from({ vertex: VERT, fragment: fragSource(), name: 'bt-look-batch' }),
    resources: {
      lookSamplers: new UniformGroup({
        uTextures: { value: units, type: 'i32', size: SLOTS },
        uPalAtlas: { value: SLOTS, type: 'i32' },
        uMaskAtlas: { value: SLOTS + 1, type: 'i32' },   /* v2.3.3752 */
      }, { isStatic: true }),
    },
  });
  return _shader;
}

function packedId(el, slot) {
  const t = el.texture;
  const look = t && t._btLook;
  const lk = look && look.row >= 0 ? look.row + 1 : 0;
  const mi = t && t._btLookMirror ? 1 : 0;
  return (((slot + 16 * (lk * 4 + mi * 2 + (el._btLookSharp ? 1 : 0))) << 16) | (el.roundPixels & 65535)) >>> 0;
}
class LookBatcher extends DefaultBatcher {
  constructor() {
    super({ maxTextures: SLOTS });
    this.name = LOOK_BATCHER;
    this.shader = lookShader();
  }
  packQuadAttributes(el, f32, u32, idx, slot) {
    super.packQuadAttributes(el, f32, u32, idx, slot);
    const v = packedId(el, slot);
    u32[idx + 5] = v; u32[idx + 11] = v; u32[idx + 17] = v; u32[idx + 23] = v;
    _stats.drawn++;
  }
  packAttributes(el, f32, u32, idx, slot) {
    super.packAttributes(el, f32, u32, idx, slot);
    const v = packedId(el, slot);
    for (let i = 0, n = el.attributeSize; i < n; i++) u32[idx + i * 6 + 5] = v;
  }
  _finishBatch(batch, indexStart, indexSize, textureBatch, blendMode, topology, instructionSet, action, elements) {
    const empty = Texture.EMPTY.source;
    for (let k = textureBatch.count; k < SLOTS; k++) textureBatch.textures[k] = empty;
    textureBatch.textures[SLOTS] = paletteAtlasSource();
    /* v2.3.3752: the armour's mask atlas after it (a blank until a figure is
       drawn under armour, lookArmour.js) */
    textureBatch.textures[SLOTS + 1] = (_maskSource && _maskSource()) || empty;
    textureBatch.count = SLOTS + 2;
    super._finishBatch(batch, indexStart, indexSize, textureBatch, blendMode, topology, instructionSet, action, elements);
  }
  _updateMaxTextures() {}
  destroy() {
    this.shader = null;
    super.destroy();
  }
}
LookBatcher.extension = { type: [ExtensionType.Batcher], name: LOOK_BATCHER };

/* ═══ WHICH BATCHER: BY THE TEXTURE (not with `?lookpalette=0`) ═══
   Inside sharpPixels' hook (installed at app.init, after this) and outside
   paletteTex's: sharp decides 'sharp' or 'default' first, this sends a look's
   texture here (keeping which read sharp chose), and paletteTex's routing
   leaves a name it does not know alone. */
const lookTex = (tex) => !!(tex && tex._source && tex._source._btLook && !tex._source.destroyed);
let _patched = false;
function patchPipes() {
  if (_patched) return;
  _patched = true;
  extensions.add(LookBatcher);
  {
    const P = BatcherPipe.prototype;
    const add = P.addToBatch;
    P.addToBatch = function (obj, instructionSet) {
      if (obj) {
        if (lookTex(obj.texture)) {
          if (obj.batcherName !== LOOK_BATCHER) obj._btLookSharp = obj.batcherName !== 'default';
          obj.batcherName = LOOK_BATCHER;
        } else if (obj.batcherName === LOOK_BATCHER) obj.batcherName = 'default';
      }
      return add.call(this, obj, instructionSet);
    };
  }
  {
    const P = SpritePipe.prototype;
    const valid = P.validateRenderable;
    P.validateRenderable = function (sprite) {
      const b = this._getGpuSprite(sprite);
      if ((b.batcherName === LOOK_BATCHER) !== lookTex(sprite._texture)) return true;
      return valid.call(this, sprite);
    };
  }
  /* uploaded at its size in pixels (Pixi uses points; the stand's are
     resolution 2), as paletteTex.js does for its own */
  {
    const U = glUploadBufferImageResource;
    const up = U.upload;
    U.upload = function (source, glTexture, gl, webGLVersion, targetOverride, forceAllocation = false) {
      if (!source || !source._btLook) return up.call(this, source, glTexture, gl, webGLVersion, targetOverride, forceAllocation);
      const target = targetOverride || glTexture.target;
      const w = source.pixelWidth, h = source.pixelHeight;
      /* v2.3.3716 (the owner put this on by default): the bytes are let go of
         once on the chip, as the Wheel's ground lets go of its colours
         (wheelGround.js _toGpu) -- 2.6 MB the page would keep for good, over
         the memory check's buffers line -- and made again from the sheet's
         <img> for the rare second upload (a rebuilt renderer after a black
         screen).  The decoded <img> is the browser's to drop and decode
         again. */
      let res = source.resource;
      if (!res) {
        res = source._btLook.make();
        _stats.remade++;
        if (!_inPrewarm) _stats.remadeInFrame++;
      }
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, source._btLook.bits === 8 ? 1 : 2);   /* v2.3.3737: an 8-bit sheet's rows are a byte a texel */
      if (!forceAllocation && glTexture.width === w && glTexture.height === h) {
        gl.texSubImage2D(target, 0, 0, 0, w, h, glTexture.format, glTexture.type, res);
      } else {
        gl.texImage2D(target, 0, glTexture.internalFormat, w, h, 0, glTexture.format, glTexture.type, res);
      }
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
      glTexture.width = w;
      glTexture.height = h;
      source.resource = null;
      if (source.options) source.options.resource = null;
    };
  }
}

/* at load, so this hook is inside sharpPixels' (installed at app.init) */
if (_wanted) patchPipes();

function programLinked(r, program) {
  try {
    const gl = r && r.gl;
    const pd = r && r.shader && typeof r.shader._getProgramData === 'function' ? r.shader._getProgramData(program) : null;
    if (!gl || !pd || !pd.program) return false;
    return !!gl.getProgramParameter(pd.program, gl.LINK_STATUS);
  } catch (e) { return false; }
}
/* built behind the loading screen: one tiny look sprite drawn nearly
   see-through (the v2.3.2904 rule: a program is compiled where it is first
   drawn) */
let _prewarmedFor = null;
function prewarmProgram() {
  const r = paletteRendererOf();
  if (!_wanted || !r || _prewarmedFor === r || !_stats.sheets) return;
  if (!webgl2(r)) { _ok = false; return; }
  _prewarmedFor = r;
  uploadSheets();
  let box = null;
  try {
    const name = Object.keys(_sheets)[0];
    const t = getLookFrameRaw(name);
    box = new Container();
    const s = new Sprite(t);
    s.width = 2; s.height = 2;
    box.addChild(s);
    box.alpha = 0.001;
    r.render({ container: box });
    _ok = programLinked(r, lookShader().glProgram);
  } catch (e) {
    _ok = false;
    _stats.linkError = String((e && e.message) || e);
  }
  if (!_ok && !_stats.linkError) _stats.linkError = 'the look program did not build on this device';
  try { if (box) box.destroy({ children: true }); } catch (e) { /* gone */ }
}
/** v2.3.3883: a new renderer (initPixiRenderer: the first, and a black
 *  screen's rebuild) -- the look program built and the sheets sent to it
 *  there, behind its wait.  Only the join's loading screen did this, so after
 *  a rebuild the program was compiled, and every sheet made again from its
 *  <img>, inside the first frames drawn. */
export function warmLookPalette() { if (_wanted) prewarmProgram(); }

/* a sheet's first frame, in the art's own colours (the prewarm, QA) */
function getLookFrameRaw(name) {
  const sh = _sheets[name];
  const f = sh.frames[0];
  return new Texture({ source: sh.src, frame: f.frame, orig: f.orig, trim: f.trim });
}

/* QA probe, house style */
if (typeof window !== 'undefined') {
  window.__btLookPalette = () => {
    let rows = 0;
    for (const l of _looks.values()) if (l.row >= 0) rows++;
    return { wanted: _wanted, why: _why /* v2.3.3838: 'address', 'windows' or 'default' (v2.3.3842: or 'mac') */, on: lookPaletteOn(), ok: _ok, renderer: !!paletteRendererOf(), prewarmed: !!_prewarmedFor, ..._stats, looks: _looks.size, rows,
      sheetMB: +(_stats.sheetBytes / 1048576).toFixed(2), sets: [..._sets.keys()].filter((k) => _sets.get(k).manifest) };
  };
}
