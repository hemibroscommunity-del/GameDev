/* ═══ v2.3.2682: SPECIES ART — load once, build one recoloured copy per skin ═══
 *
 * What the renderer contract in docs/specs/SPECIES-PLAN.md (Stage 2d) asks for,
 * in one place so the world renderer and the portrait cannot disagree:
 *
 *   public/sprites/traits/species/<id>/
 *     meta.json                 anchors / crownNudge / scaleByPose (poseFit) /
 *                               frameOverlays / fur -- tools/species_frames.py
 *     <dir>.png                 the piece, one per facing, placed by _placeTrait
 *     <dir>.fur.png             its fur patches as BARE SKIN (SW, NE only)
 *     frames/<pose>-<dir>.png   per-frame overlays, side by side, drawn in body
 *                               space instead of the piece on those frames
 *     frames/<pose>-<dir>.fur.png   their fur, same rects
 *
 * A BUILD is the piece for one skin: every image with its fur twin recoloured
 * by playerSkins' own retintSkinPixels (the maths the body gets) and drawn over
 * it.  The muzzle and ears are never touched, so they keep the art's tan on
 * every skin (owner, v2.3.2681).  Builds are cached per skin TARGET (two skin
 * ids with one target share a build) and capped, like every recolour cache.
 *
 * PRELOADING IS LAW (CLAUDE.md).  preloadSpeciesArt() loads every image of
 * every species during the loading screen; building a skin's copy afterwards is
 * a canvas pass over images already in memory, not a network load.
 */
import { Cache, Texture, Rectangle } from 'pixi.js';
import { releaseCanvasSource } from '../releaseCanvasTexture.js';   /* v2.3.3074 */
import { keepAsImage } from '../keepAsImage.js';   /* v2.3.3606 */
import { skinTarget, retintSkinPixels, poseSkinTarget } from '../playerSkins.js';   /* v2.3.2861: + poseSkinTarget */
import { SPECIES_CATALOG } from './speciesCatalog.js';

/* This folder's own cache-buster -- bump it when the species art changes.
   Not the shared TRAIT_VER: that one moves for sweeps of the other trait art.
   v2.3.3590: bumped for the alien's frames, re-baked with the covers that
   paint the bro's own eyes out under the collection's Alien Eyes (tools/
   species_alien.py), and its meta.json and thumbs with them. */
const SPECIES_ART_VER = '2.3.3603';   /* v2.3.3603: the east ear's outline one pixel (tools/thin_alien_east.py) */
const DIRS = ['south', 'southwest', 'east', 'northeast', 'north'];

const _art = Object.create(null);      /* id -> Promise<art|null>; rule 4: keyed by an id off a saved look */
const _artReady = Object.create(null); /* id -> art (once loaded) */
const _builds = Object.create(null);   /* id|target -> build */
const _canvases = Object.create(null); /* id|target -> { dir: canvas } for the portrait */

function _url(id, path, round) { return `/sprites/traits/species/${id}/${path}?v=${SPECIES_ART_VER}${round ? `&g=${round}` : ''}`; }   /* v2.3.3870: + the later round's bust */

/* ═══ v2.3.3870: A PICTURE GIVEN UP ON IS ASKED FOR AGAIN, LATER ═══
   The owner, 2026-10-29, on a computer: "west and southwest monkey face
   disappeared" -- the muzzle gone in a facing, then in others, back "if the
   game reloaded".  _loadImg's two retries (1.5 s, 5 s) were the end of it: a
   picture still failing was null for the visit, and that facing's piece hid
   until a reload (v2.3.3689's note below: "that facing hides").  The head
   pieces have been tried again later since v2.3.3606 (entityRenderer
   _traitGaveUp); the species never was.  Now a picture given up on is
   remembered, and while the species is drawn (getSpeciesBuild, every frame)
   it is asked for again: 5 s after, then 10, 20, 40 and every minute (the
   head pieces' times), each round its own `&g=` bust.  When it comes, the
   species' builds are made again with it.  Ten rounds at most.  mp-speciesgc
   fails the files for a while and checks they come back; `?traitretry=0` (the
   head pieces' switch) or `?retrylooks=0` (the one every loader that asks
   again shares, docs/specs/retry-looks.md) is the game as it was. */
const SPECIES_RETRY_LATER_MS = [5000, 10000, 20000, 40000, 60000];
const SPECIES_RETRY_ROUNDS = 10;
let _retryOn = true;
try { if (typeof location !== 'undefined' && /[?&](traitretry|retrylooks)=0\b/.test(location.search || '')) _retryOn = false; } catch (e) { /* on */ }
function _gaveUp(art) {
  if (!_retryOn || !art.missing.length || (art.rounds || 0) >= SPECIES_RETRY_ROUNDS) return;
  art.retryAt = Date.now() + SPECIES_RETRY_LATER_MS[Math.min(art.rounds || 0, SPECIES_RETRY_LATER_MS.length - 1)];
}
/* another round for the pictures given up on, once its time has come */
function _retryMissing(art) {
  if (!art.retryAt || Date.now() < art.retryAt) return;
  art.retryAt = 0;
  art.rounds = (art.rounds || 0) + 1;
  const round = art.rounds;
  const want = art.missing;
  art.missing = [];
  Promise.all(want.map((m) => _loadImg(_url(art.id, m.path, round)).then((im) => {
    if (im) art[m.into][m.key] = im;
    else art.missing.push(m);
    return !!im;
  }))).then((got) => {
    if (got.some(Boolean)) _dropBuilds(art.id);   /* made again, with the pictures that came */
    _gaveUp(art);
  });
}

function _loadImg(url, attempt = 0) {
  return new Promise((res) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => {
      /* the v2.3.1305 bounded retry: one flaked request must not leave a
         facing missing for the whole session */
      if (attempt < 2) setTimeout(() => _loadImg(url, attempt + 1).then(res), [1500, 5000][attempt]);
      else res(null);
    };
    im.src = url + (attempt ? `&r=${attempt}` : '');
  });
}

/** Load every image a species needs.  Resolves to the art, or null for 'none'
 *  / an unknown id / a meta that would not load. */
export function loadSpeciesArt(id) {
  if (!id || id === 'none' || !SPECIES_CATALOG.some((e) => e.id === id)) return Promise.resolve(null);
  if (_art[id]) return _art[id];
  _art[id] = fetch(_url(id, 'meta.json'))
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null)
    .then((meta) => {
      if (!meta) { delete _art[id]; return null; }
      const fur = meta.fur || {};
      const jobs = [];
      const art = { id, meta, base: {}, baseFur: {}, strips: {}, stripFur: {}, missing: [], retryAt: 0, rounds: 0 };
      /* v2.3.3870: a picture that did not come is remembered for a later round */
      const one = (path, into, key) => _loadImg(_url(id, path)).then((im) => {
        art[into][key] = im;
        if (!im) art.missing.push({ path, into, key });
      });
      for (const d of DIRS) {
        if (!meta.anchors || !meta.anchors[d]) continue;
        jobs.push(one(`${d}.png`, 'base', d));
      }
      for (const d of (fur.base || [])) jobs.push(one(`${d}.fur.png`, 'baseFur', d));
      for (const k of Object.keys(meta.frameOverlays || {})) jobs.push(one(`frames/${k}.png`, 'strips', k));
      for (const k of (fur.frames || [])) jobs.push(one(`frames/${k}.fur.png`, 'stripFur', k));
      return Promise.all(jobs).then(() => { _artReady[id] = art; _gaveUp(art); return art; });
    });
  return _art[id];
}

/** Preload manifest entry: every species' art, on the loading screen. */
export function preloadSpeciesArt() {
  return Promise.all(SPECIES_CATALOG.filter((e) => e.id !== 'none').map((e) => loadSpeciesArt(e.id)));
}

/* The piece plus its recoloured fur, as a canvas. */
function _compose(img, furImg, target) {
  if (!img) return null;
  const cv = document.createElement('canvas');
  cv.width = img.naturalWidth || img.width;
  cv.height = img.naturalHeight || img.height;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  if (furImg) {
    const fc = document.createElement('canvas');
    fc.width = cv.width; fc.height = cv.height;
    const fctx = fc.getContext('2d', { willReadFrequently: true });
    fctx.drawImage(furImg, 0, 0);
    if (target) {
      const id = fctx.getImageData(0, 0, fc.width, fc.height);
      retintSkinPixels(id.data, target);
      fctx.putImageData(id, 0, 0);
    }
    ctx.drawImage(fc, 0, 0);
  }
  return cv;
}

function _targetKey(target) { return target ? target.join(',') : 'native'; }

/** The facing canvases for (species, skin) -- the portrait's input.  Resolves
 *  to { dir: canvas } (facings the art has), or null. */
export function speciesCanvases(id, skinId) {
  return loadSpeciesArt(id).then((art) => {
    if (!art) return null;
    const target = skinTarget(skinId);
    const key = id + '|' + _targetKey(target);
    if (!_canvases[key]) {
      const out = {};
      for (const d of Object.keys(art.base)) out[d] = _compose(art.base[d], art.baseFur[d], target);
      _canvases[key] = out;
    }
    return { meta: art.meta, canvases: _canvases[key] };
  });
}

const _BUILD_CAP = 6;
function _capBuilds() {
  const keys = Object.keys(_builds);
  if (keys.length <= _BUILD_CAP) return;
  _releaseBuild(keys[0]);
}
/* v2.3.3870: every build of a species, let go of (its pictures came in a later
   round: the next ask makes it again with them), and its portrait canvases */
function _dropBuilds(id) {
  for (const k of Object.keys(_builds)) if (k.split('|')[0] === id) _releaseBuild(k);
  for (const k of Object.keys(_canvases)) if (k.split('|')[0] === id) delete _canvases[k];
}
function _releaseBuild(k) {
  const b = _builds[k];
  delete _builds[k];
  if (!b) return;
  /* deferred, so a texture still being drawn this frame is not pulled out */
  setTimeout(() => {
    try {
      /* v2.3.3074: the whole release, Cache entry and canvas too (TRAPS §139) */
      for (const d in b.tex) if (b.tex[d] && b.tex[d].source) releaseCanvasSource(b.tex[d].source);
      for (const k2 in b.stripTex) if (b.stripTex[k2] && b.stripTex[k2].source) releaseCanvasSource(b.stripTex[k2].source);
    } catch (e) { /* ignore */ }
  }, 30000);
}

/* v2.3.3689: a facing whose picture never came (its load given up) has no
   canvas; Texture.from(null) threw "Could not find a source type" in every
   frame the piece was drawn, which skipped the rest of the bro's update (his
   eyes, glasses and hair kept the frame before) and, past 90, rebuilt the
   renderer.  No canvas, no texture: that facing hides, as any head piece's
   does while its picture is out */
function _texFrom(cv) {
  if (!cv) return null;
  const t = Texture.from(cv);
  if (t && t.source) { t.source.scaleMode = 'linear'; t.source.autoGenerateMipmaps = true; keepAsImage(t.source, Cache); }   /* match the other traits (_loadTraitDir); v2.3.3606: kept as an image of itself (keepAsImage.js) */
  return t;
}

/** The world renderer's input for (species, skin): { meta, tex: { dir: Texture },
 *  frames: { 'pose-dir': { frameIdx: Texture } } }, or null while the art is
 *  still loading (the caller hides the sprite, exactly as for a trait whose
 *  texture has not arrived).  Synchronous once the art is in memory. */
export function getSpeciesBuild(id, skinId) {
  if (!id || id === 'none') return null;
  const art = _artReady[id];
  if (!art) { loadSpeciesArt(id); return null; }
  if (art.retryAt) _retryMissing(art);   /* v2.3.3870: a picture given up on, asked for again while drawn */
  const target = skinTarget(skinId);
  const key = id + '|' + _targetKey(target);
  let b = _builds[key];
  if (b) { delete _builds[key]; _builds[key] = b; return b; }   /* LRU touch */
  b = { meta: art.meta, tex: {}, stripTex: {}, frames: {} };
  for (const d of Object.keys(art.base)) b.tex[d] = _texFrom(_compose(art.base[d], art.baseFur[d], target));
  for (const k of Object.keys(art.strips)) {
    /* v2.3.2861: the hit strips' fur was painted in the hit sheets' orange, and
       the default skin's hit body now wears the walking skin (playerSkins
       POSE_SKIN_FLOOR) -- the fur takes the same target, or it would stay
       orange on a tan face.  The key is 'pose-dir'. */
    const cv = _compose(art.strips[k], art.stripFur[k], poseSkinTarget(target, k.split('-')[0]));
    if (!cv) continue;
    const st = _texFrom(cv);
    b.stripTex[k] = st;
    const rects = (art.meta.frameOverlays || {})[k] || {};
    const per = {};
    for (const f of Object.keys(rects)) {
      const [sx, sy, w, h] = rects[f];
      per[f] = new Texture({ source: st.source, frame: new Rectangle(sx, sy, w, h) });
    }
    b.frames[k] = per;
  }
  _builds[key] = b;
  _capBuilds();
  return b;
}

/* QA hook: which builds exist, and what the art loaded -- a scenario asserts on
   these rather than on a 40px screenshot. */
if (typeof window !== 'undefined') {
  window.__btSpeciesArt = () => ({
    loaded: Object.keys(_artReady),
    builds: Object.keys(_builds),
    strips: Object.fromEntries(Object.entries(_artReady).map(([id, a]) => [id, Object.keys(a.strips).length])),
  });
}
