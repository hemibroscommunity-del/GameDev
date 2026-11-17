/* ═══ v2.3.3728: THE EFFECTS DRAWN FROM THEIR 256-COLOUR TWINS ═══
 *
 * docs/specs/pictures-256.md.  The owner, 2026-10-28: "You can go ahead and
 * reduce it. I won't notice at all from anything at 256."  Every effect drawn
 * in the world (the hit bursts, the whirlwind, the stun stars, the fire
 * trail, the portal's beam, the arrow blast...) and the gathering tools'
 * strips have a twin beside them on 256 colours (tools/art/reduce256.mjs,
 * listed in src/data/p256Files.js).  With `?p256=1` (off by default, the
 * measurement below) the game reads the twin, and a picture on
 * 256 colours is kept as colour numbers: one byte a pixel in the page and on
 * the graphics chip, where it was four on the chip (picsNumbers.js, the
 * monsters' way; paletteTex.js draws them).  One row of the atlas's colours
 * for each picture, whatever its frames.
 *
 * Two doors, as the pictures are loaded two ways:
 *   - a strip cropped and packed (gearSheets.js loadCroppedStrip): the twin is
 *     packed instead of the original, and the packed strip read into its
 *     numbers at once (stripAsNumbers);
 *   - a picture Pixi's loader loads whole (Assets.load: the portal's beam, the
 *     arrow blast, the snowball's burst, the anvil, the footprints): a loader
 *     ahead of Pixi's own reads the twin as a picture, its numbers off a
 *     canvas once, and hands back a texture of colour numbers -- the same
 *     address, the same size, so nothing that loads, finds or frees it
 *     changes (Assets.unload destroys it, which gives its row back).  (One
 *     twin is a column wider, the fish spot's pond: v2.3.5565, FISH_SPOT.)
 * Anything that cannot be (no colour-numbers program on this device, a row
 * short, a twin that will not load) is the original, as before.
 *
 * Probe: window.__btP256(). */
import { extensions, ExtensionType, LoaderParserPriority, Texture, Rectangle, Cache, loadTextures } from 'pixi.js';
import { P256_FILES } from '../data/p256Files.js';
import { picNumbersOn, stripAsNumbers } from './picsNumbers.js';
import { isPaletteSource } from './paletteDraw.js';
import { paletteDecided } from './paletteTex.js';
import { addPictureRestorer } from './picsOnce.js';

const _q = (() => { try { return typeof location !== 'undefined' ? (location.search || '') : ''; } catch (e) { return ''; } })();
/* OFF by default (v2.3.3728, measured): at the memory check's Flame Fields
   fight the chip held 2.3 MB less and the page's buffers 0.8 MB more, and on
   arrival the chip 2.8 MB more (every effect sent up front) -- a picture this
   small at play is not worth its colours yet.  `?p256=1` turns it on to try;
   the docs/specs/pictures-256.md numbers. */
/* ═══ v2.3.5249: ON FOR ONE FAMILY AT A TIME (card P's backlog) ═══
   The owner, 2026-11-14 ("Go recommended"): the effects' twins go on, each
   family of the asset door (tools/assets/families.mjs) its own PR, on by
   default with its own `?name=0`.  The first is `fx-made`, the effects the
   game's own tools made (the fire trail, the portal's beam, the anvil, the
   snow's footprints, the arrow's blast, the jet stream): 3.1 MB held as
   pictures in the page at the memory check's fight.  Not the snowball's
   burst (the gatekeeper's sitting 8): it loads as you walk toward the frost
   land, in play, and a twin's numbers are read off a canvas on the page.
   `?fxmade=0` keeps them pictures.  `?p256=1` still turns every twin on to
   try (the gathering tools' and the owner's sheets too); `?p256=0` turns
   every one off. */
const ALL_TWINS = /[?&]p256(=1)?(&|$)/.test(_q);
const NO_TWINS = /[?&]p256=0(&|$)/.test(_q);
const FX_MADE = /^\/sprites\/(?:fx\/(?:fire-trail-v1\.png|portal-beam\.webp|smith-anvil\.webp|snow-footprints\.webp)|effects\/(?:arrow-blast-v1\.webp|jet-stream-v1\.png))$/;
const FX_MADE_ON = !NO_TWINS && !/[?&]fxmade=0(&|$)/.test(_q);
/* v2.3.5250, the next family: `icons-items-world`, the icons drawn in the
   world -- the ore that pops from a rock, the trap's box, the nine shards,
   the heart and sword popups (1.6 MB held as pictures in the page at the
   fight).  Their twins: tools/art/reduce256.mjs, by name.  `?worldicons=0`
   keeps them pictures.  (The arrow, dice, spell and xp popups have no twin:
   their widths need padding.)  Not the trap's box (the gatekeeper's sitting
   9): a missed trap breaks it into pieces (trapFx.js _missBreak, wheelShatter
   cutPicture), a read of its pixels long after the pack has emptied its
   page copy -- it drew planks in their place. */
const WORLD_ICONS = /^\/icons\/(?:items\/(?:ore-iron|ore-black-steel|ore-obsidian)|shards\/shard_[a-z]+|popups\/(?:heart-256|sword))\.webp$/;
const WORLD_ICONS_ON = !NO_TWINS && !/[?&]worldicons=0(&|$)/.test(_q);
/* v2.3.5252, `fx-sheets-supplied`: the effects cut from the owner's own
   sheets (the stun stars, the whirlwind, and the grease, woodchips, rocks
   and splash bursts): 2.0 MB held at the fight, all of it the whirlwind,
   whose pack the packer declines (gearSheets.js loadCroppedStrip now reads
   such a twin as numbers whole).  `?fxsheets=0` keeps them pictures. */
const FX_SHEETS = /^\/sprites\/(?:fx\/(?:stun-stars-v1|whirl-vortex-v1)\.png|effects\/(?:grease|woodchips|rocks|splash)-burst-v1\.webp)$/;
const FX_SHEETS_ON = !NO_TWINS && !/[?&]fxsheets=0(&|$)/.test(_q);
/* v2.3.5258, `icons-elements`: the eight elements' marks drawn after a hit's
   number (effectsRenderer.js POPUP_ICON_SRC: 2.1 MB held as pictures in the
   page at the fight), cut to their own box as they load (_tightPopupIcon,
   through readSourceRect, before the chip ever has them), as the heart is.
   On 256 colours or fewer already: their twins are exact.  Not the 64 px
   plate icons (entityRenderer.js loads those its own way) nor the gems'
   dark and light (<img>s).  `?elemicons=0` keeps them pictures. */
const ELEM_ICONS = /^\/icons\/ui\/elem-(?:flame|frost|water|venom|flora|stone|storm|wind)\.webp$/;
const ELEM_ICONS_ON = !NO_TWINS && !/[?&]elemicons=0(&|$)/.test(_q);
/* v2.3.5562, `traits-hairmasks`: the hats' hair masks, the white silhouettes
   the hair is clipped to under a hat (entityRenderer.js _loadHairMaskDir,
   hairClip.js's stencil): 128 px, two colours, so their twins are exact.
   Loaded for every clipping hat drawn -- yours, other players', the
   townsfolk's -- and kept: 2.1 MB at the memory check's fight, four bytes a
   pixel in the page.  As colour numbers, a byte a pixel; the stencil draws a
   numbers silhouette with its own program (hairClip.js).  `?hairmasks=0`
   keeps them pictures. */
const HAIRMASKS = /^\/sprites\/traits\/headwear\/[a-z0-9-]+\/hairmask\/(?:east|north|northeast|south|southwest)\.png$/;
/* (not with `?alphaclip`, the alpha mask as it was: a filter reads the
   silhouette as a picture, which a colour numbers' cannot be) */
const HAIRMASKS_ON = !NO_TWINS && !/[?&]hairmasks=0(&|$)/.test(_q) && !/[?&]alphaclip\b/.test(_q);
/* v2.3.5563, `pets`: the pet sheet every pet is drawn from (petSprites.js, on
   the loading screen for everyone, a pet going everywhere you go): 1.5 MB
   held as a picture in the page at the memory check's fight, where no pet
   is drawn.  Its twin cuts 79k colours to 256 (moved 0.021 OKLab, under the
   whirlwind's 0.028).  The pet's portrait (petPortrait.jsx) is an <img> of
   the sheet itself, unchanged.  `?petsheet=0` keeps it a picture. */
const PET_SHEET_P = /^\/sprites\/pets\/pet-sheet\.png$/;
const PET_SHEET_ON = !NO_TWINS && !/[?&]petsheet=0(&|$)/.test(_q);
/* v2.3.5564, `cape-hood`: a cape's hood's hair masks, the silhouettes the
   hair is clipped to under a hood (hairClip.js, as a hat's; capeSprites.js,
   the crimson cape's three cut facings, behind the loading screen with the
   capes): exact, and on the hats' masks' row (bundleOf).  NOT the hood's
   halves (sitting 20, answer (a)): a cape is pixel art drawn crisp (its
   source `nearest`, and sharpPixels.js's read as a piece of the figure), and
   colour numbers are drawn by a read that blends four texels, honouring
   neither; they stay pictures.  `?capehood=0` keeps the masks pictures; and
   with `?alphaclip`, as the hats'. */
const CAPE_HOOD = /^\/sprites\/traits\/cape\/[a-z0-9-]+\/hood\/hairmask-(?:east|south|southwest)\.png$/;
const CAPE_HOOD_ON = !NO_TWINS && !/[?&]capehood=0(&|$)/.test(_q) && !/[?&]alphaclip\b/.test(_q);
/* v2.3.5565, `world-fish-spot`: the pond under a fishing spot
   (effectsRenderer.js NODE_SPRITE_SOURCES, behind the loading screen for
   everyone and kept): 1.5 MB held as a picture in the page at the memory
   check's fight.  Its twin cuts 32k colours to 256 (moved 0.008 OKLab) and
   is ONE COLUMN WIDER than the picture (628, `pad` in p256Files.js): a
   see-through column on its right, where the pond never reaches, made by
   tools/art/reduce256.mjs, so the rule below holds (no twin needing padding
   here).  The one twin not the same size: the pond is scaled by its height
   at anchor (0.5, 0.5), so it is drawn the same size, half a texel left.
   `?fishspot=0` keeps it a picture. */
const FISH_SPOT = /^\/sprites\/world\/fish-spot-627\.webp$/;
const FISH_SPOT_ON = !NO_TWINS && !/[?&]fishspot=0(&|$)/.test(_q);
/** whether the picture at `path` (no host, no query) is read from its twin here */
function wantedPath(path) { return !NO_TWINS && (ALL_TWINS || (FX_MADE_ON && FX_MADE.test(path)) || (WORLD_ICONS_ON && WORLD_ICONS.test(path)) || (FX_SHEETS_ON && FX_SHEETS.test(path)) || (ELEM_ICONS_ON && ELEM_ICONS.test(path)) || (HAIRMASKS_ON && HAIRMASKS.test(path)) || (PET_SHEET_ON && PET_SHEET_P.test(path)) || (CAPE_HOOD_ON && CAPE_HOOD.test(path)) || (FISH_SPOT_ON && FISH_SPOT.test(path))); }
const WANTED = !NO_TWINS && (ALL_TWINS || FX_MADE_ON || WORLD_ICONS_ON || FX_SHEETS_ON || ELEM_ICONS_ON || HAIRMASKS_ON || PET_SHEET_ON || CAPE_HOOD_ON || FISH_SPOT_ON);
/* (never while QA compares cropped strips against their files: __btTrimVerify) */
export function p256On() { return WANTED && picNumbersOn(); }

const _stats = { strips: 0, pictures: 0, asOriginal: 0, readMs: 0, undecided: 0 };

function pathOf(url) {
  let p = String(url || '');
  const q = p.search(/[?#]/);
  if (q >= 0) p = p.slice(0, q);
  const m = /^[a-z]+:\/\/[^/]+(\/.*)$/i.exec(p);
  return m ? m[1] : p;
}
function queryOf(url) {
  const s = String(url || ''), q = s.indexOf('?');
  return q < 0 ? '' : s.slice(q);
}

/* v2.3.5562: the picture's bundle of rows on the colour atlas: a file's own,
   but the hats' hair masks one bundle together -- each is the same two
   colours (see-through and white), so they share one row, where a bundle
   each took a row each (30 rows for the hats in view at the memory check's
   fight).  Neither is ever let go (these pictures are kept for the game). */
/* v2.3.5564: a hood's hair masks are the same two colours: the same row */
const HOOD_MASK = /^\/sprites\/traits\/cape\/[a-z0-9-]+\/hood\/hairmask-/;
function bundleOf(url) { const p = pathOf(url); return (HAIRMASKS.test(p) || HOOD_MASK.test(p)) ? 'p256:hairmasks' : 'p256:' + p; }

/* a picture with a twin, wanted */
function listed(url) {
  if (!WANTED || !wantedPath(pathOf(url))) return null;
  const e = P256_FILES[pathOf(url)];
  return e && !(e.w % 4) ? e : null;
}

/* ═══ WAITING FOR THE RENDERER'S WORD ═══
   The effects are asked for as their modules are read -- before the renderer
   is made and says whether this device draws colour numbers (paletteTex.js
   setPaletteRenderer).  A picture with a twin waits for that word (at most
   DECIDE_MS: then the original, as before), so it is the twin where it will be
   drawn as numbers and the original everywhere else.  Everything waiting is
   still behind the loading screen (the fx preload gates). */
const DECIDE_MS = 20000;
let _decided = null;
export function whenPaletteDecided() {
  if (paletteDecided()) return Promise.resolve(true);
  if (_decided) return _decided;
  _decided = new Promise((res) => {
    const t0 = Date.now();
    const tick = () => {
      if (paletteDecided()) { _decided = null; res(true); return; }
      if (Date.now() - t0 > DECIDE_MS) { _decided = null; _stats.undecided++; res(false); return; }
      setTimeout(tick, 50);
    };
    tick();
  });
  return _decided;
}

/** For a strip loader: the address to load for `url` -- its twin where it will
 *  be drawn as colour numbers, else `url` itself.  Resolves at once for a
 *  picture with no twin. */
export async function p256Address(url) {
  if (!listed(url)) return url;
  await whenPaletteDecided();
  return p256Twin(url) || url;
}

/** The twin's address for `url` (its own query kept, so a cache-busting
 *  version still busts), or null: no twin, or not read that way here. */
export function p256Twin(url) {
  if (!p256On() || !wantedPath(pathOf(url))) return null;
  const e = P256_FILES[pathOf(url)];
  if (!e) return null;
  /* a texture's frames are cut by its width: a twin is used only where its
     colour numbers need no padding (every one listed is) */
  if (e.w % 4) return null;
  return e.twin + queryOf(url);
}

/** gearSheets.js loadCroppedStrip, once packed: the strip as colour numbers on
 *  its own row, or null (the canvas stays, as before). */
export function packedTwinAsNumbers(url, canvas) {
  const src = stripAsNumbers(bundleOf(url), canvas, String(url));
  if (src) { _stats.strips++; _toPack.add(src); }
  else _stats.asOriginal++;
  return src;
}

/* ── the loader for a picture loaded whole ── */
function loadImage(url) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = url;
  });
}
function textureOf(src, loader, url, w, h) {
  src.label = url;
  src._sourceOrigin = url;
  const tex = new Texture({ source: src, frame: new Rectangle(0, 0, w, h), label: url });
  const forget = () => {
    delete loader.promiseCache[url];
    if (Cache.has(url)) Cache.remove(url);
  };
  src.once('destroy', () => { if (loader.promiseCache[url]) forget(); });
  tex.once('destroy', () => { if (!src.destroyed) forget(); });
  return tex;
}
export const p256LoadParser = {
  name: 'btP256Load',
  id: 'bt-p256',
  extension: { type: ExtensionType.LoadParser, priority: LoaderParserPriority.High + 2, name: 'btP256Load' },
  test(url) { return !!listed(url); },
  async load(url, asset, loader) {
    await whenPaletteDecided();
    const twin = p256Twin(url);
    if (!twin) return loadTextures.load(url, asset, loader);
    const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
    let src = null, w = 0, h = 0;
    try {
      const img = await loadImage(twin);
      w = img.naturalWidth; h = img.naturalHeight;
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      cv.getContext('2d', { willReadFrequently: true }).drawImage(img, 0, 0);
      src = stripAsNumbers(bundleOf(url), cv, String(url));
      /* (kept only for QA's comparison: picsNumbers.js __btPicNumVerify) */
      if (!(src && src.__btOrigCanvas === cv)) { cv.width = 0; cv.height = 0; }
    } catch (e) { src = null; }
    if (typeof performance !== 'undefined') _stats.readMs += Math.round(performance.now() - t0);
    if (!src) {
      _stats.asOriginal++;
      return loadTextures.load(url, asset, loader);
    }
    _stats.pictures++;
    _toPack.add(src);
    return textureOf(src, loader, String(url), w, h);
  },
  unload(texture, asset, loader) {
    if (texture && texture.source && isPaletteSource(texture.source)) { texture.destroy(true); return; }
    return loadTextures.unload(texture, asset, loader);
  },
};
extensions.add(p256LoadParser);

/* ═══ THE NUMBERS PACKED ONCE THEY ARE ON THE CHIP ═══
   An effect kept as colour numbers holds them twice: in the page (a byte a
   pixel: what a rebuilt renderer is sent) and on the chip.  Nothing reads an
   effect's picture back on the CPU (the census, pictures-once.md), and its
   numbers are mostly see-through -- so once this renderer has them, the page
   keeps them DEFLATED (CompressionStream: a tenth to a fiftieth of the bytes)
   and lets the plain ones go.  Before any chip is sent them again they are
   unpacked: a black screen's rebuild waits for every one (picsOnce.js
   restoreAllPictures, in createPixiApp), and a chip that asks for one still
   packed gets its space empty and the numbers the moment they are out
   (`blankUploads`: QA reads 0).  Pixi's collector never takes these off the
   chip (made with autoGarbageCollect false).  One not drawn yet is sent to the
   chip first: there it is a byte a pixel, where its plain numbers waiting in
   the page were the same and its picture before this was four. */
const _toPack = new Set();
const _packed = new Set();
const _pk = { sent: 0, packed: 0, packedMB: 0, packedKB: 0, unpacked: 0, blankUploads: 0, failed: 0 };
const EMPTY = new Uint8Array(0);
async function deflate(u8) {
  const stream = new Blob([u8]).stream().pipeThrough(new CompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
async function inflate(u8) {
  const stream = new Blob([u8]).stream().pipeThrough(new DecompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
const isPacked = (src) => !!(src && src.__btPack && src.__btPack.z);
async function pack(src, renderer) {
  const idx = src.resource;
  if (!idx || !idx.length || src.__btPack) return;
  src.__btPack = { z: null, n: idx.length, busy: true };
  let z = null;
  try { z = await deflate(idx); } catch (e) { z = null; }
  const P = src.__btPack;
  P.busy = false;
  /* given up: nothing to pack it with, the source gone, or it changed or left
     this chip meanwhile */
  if (!z || src.destroyed || src.resource !== idx || !(src._gpuData && src._gpuData[renderer.uid])) { src.__btPack = null; if (!z) _pk.failed++; return; }
  P.z = z;
  src.resource = EMPTY;
  if (src._btNumbers) src._btNumbers = null;
  try { if (src.options) src.options.resource = null; } catch (e) { /* frozen */ }
  _packed.add(src);
  src.once('destroy', () => _packed.delete(src));
  _pk.packed++;
  _pk.packedMB = +(_pk.packedMB + idx.length / 1048576).toFixed(2);
  _pk.packedKB += Math.round(z.length / 1024);
}
export function unpack(src) {
  if (!isPacked(src)) return Promise.resolve(true);
  const P = src.__btPack;
  if (P.out) return P.out;
  P.out = inflate(P.z).then((idx) => {
    if (src.destroyed) return false;
    if (idx.length !== P.n) { _pk.failed++; return false; }
    src.resource = idx;
    src.__btPack = null;
    _packed.delete(src);
    _pk.unpacked++;
    /* packed again once a chip has it */
    _toPack.add(src);
    if (P.blank) { try { src.update(); } catch (e) { /* sent when next drawn */ } }
    return true;
  }).catch(() => { _pk.failed++; P.out = null; return false; });
  return P.out;
}
addPictureRestorer(() => Promise.all([..._packed].map((s) => unpack(s))));

let _upInstalled = false;
export function installP256Upload(GlTextureSystem) {
  if (_upInstalled || !WANTED || !GlTextureSystem || !GlTextureSystem.prototype) return;
  _upInstalled = true;
  const P = GlTextureSystem.prototype;
  const upd = P.onSourceUpdate;
  P.onSourceUpdate = function (source) {
    if (isPacked(source)) {
      _pk.blankUploads++;
      source.__btPack.blank = true;
      const glTexture = this.getGlSource(source);
      this._gl.bindTexture(glTexture.target, glTexture.texture);
      this._boundTextures[this._activeTextureLocation] = source;
      this._initEmptyTexture2D(glTexture, source);
      glTexture.width = source.pixelWidth;
      glTexture.height = source.pixelHeight;
      unpack(source);
      return;
    }
    return upd.call(this, source);
  };
}

let _timer = 0;
export function startP256Pack(renderer, canvas) {
  if (!WANTED || typeof CompressionStream === 'undefined') return;
  if (_timer) clearInterval(_timer);
  _timer = setInterval(() => {
    try {
      const gl = renderer.gl;
      if (!gl || gl.isContextLost()) return;
      /* not on this chip yet: sent now (an effect is loaded behind the
         loading screen to be drawn; at a byte a pixel on the chip it costs
         less than its numbers held in the page until its first draw) */
      for (const src of _toPack) {
        if (src.destroyed) { _toPack.delete(src); continue; }
        if (!(src._gpuData && src._gpuData[renderer.uid])) {
          try { renderer.texture.initSource(src); } catch (e) { continue; }
          if (!(src._gpuData && src._gpuData[renderer.uid])) continue;
          _pk.sent++;
        }
        _toPack.delete(src);
        pack(src, renderer);
      }
    } catch (e) { /* next time */ }
  }, 1000);
  /* the graphics lost: every packed picture unpacked at once */
  try { canvas.addEventListener('webglcontextlost', () => { for (const s of [..._packed]) unpack(s); }); } catch (e) { /* the rebuild still waits */ }
}

if (typeof window !== 'undefined') {
  window.__btP256 = () => ({ wanted: WANTED, on: p256On(), all: ALL_TWINS, fxMade: FX_MADE_ON, worldIcons: WORLD_ICONS_ON, fxSheets: FX_SHEETS_ON, elemIcons: ELEM_ICONS_ON, hairMasks: HAIRMASKS_ON, petSheet: PET_SHEET_ON, capeHood: CAPE_HOOD_ON, fishSpot: FISH_SPOT_ON, twins: Object.keys(P256_FILES).length, ..._stats,
    pack: { ..._pk, packedNow: _packed.size, waiting: _toPack.size } });
}
