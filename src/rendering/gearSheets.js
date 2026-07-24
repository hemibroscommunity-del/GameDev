/* Layered gear sheets (paper-doll equipment).
 *
 * Each gear piece is a transparent sprite sheet that shares the body's exact
 * frame layout: public/sprites/gear/<slot>/<item>/<pose>-<dir>.png, a strip of
 * 256x256 frames in the same count/order as the body's <pose>-<dir>.png.  Frame
 * i of the gear is pixel-aligned to frame i of the body, so the renderer draws
 * it with the SAME transform as the body sprite -- no anchors, no angles.
 *
 * This module just loads + slices + caches frame textures (mirror of
 * playerSkins.buildBodySheet).  Mirroring of west/nw/se is handled by the caller
 * copying the body sprite's (negative) scale.x, so we always load the BASE dir.
 *
 * See gear-layer-spec.md.
 */

import { Rectangle, Texture } from 'pixi.js';
import { GEAR_SLOTS, GEAR_CATALOG } from './gearCatalog.js';
import { upscaleToFrameHeight, antialiasUpscaledCanvas, downscaleByFactor, DISPLAY_DS } from './spriteScale.js'; /* v2.3.1110 upscale; v2.3.1341 AA; v2.3.1408 fullset display-downscale */
import { loadWebpOrPng } from './webpImage.js'; /* v2.3.1122: prefer lossless WebP, fall back to PNG */

const FRAME_W = 256;
const FRAME_H = 256;
/* v2.3.708: NE jog gear re-painted on the new 24-frame body cycle (see
   playerSprites VERSION 69); chain belt re-baked into the chest sheet. */
/* v2.3.748: + shirt/tshirt white-base sheets (all 5 base dirs by v2.3.754). */
/* v2.3.1053: + pickup-south sheets for chest/steelplate, legs/steelgreaves,
   and shirt/tshirt -- the loot-pickup freeze pose now shows the recoloured
   shirt + equipped plate instead of the bare body (owner-drawn art). */
/* v2.3.1054: pickup greaves rescaled +25% (owner) -- bump to refetch the PNG. */
/* v2.3.1123: + fish-south sheets for chest/steelplate, legs/steelgreaves, and
   shirt/tshirt -- the fishing pose now shows the equipped plate/greaves and the
   recoloured shirt (paper-doll, mirrors the cook stand-in). Each is a 4096x128
   32-frame strip aligned to fish-south.png; the armor tracks the body's per-
   frame lean, the shirt is a grayscale tint base with a 1px outline. */
const GEAR_VERSION = '2.3.1393'; /* v2.3.1393: east collar slit-fill under the jaw (fix_east_neck_collar.py). v2.3.1381: south fullset rebuilt on armor-anchored cuts (shoulder slivers). v2.3.1380: SW f1 two-band cut — face clear, pauldron kept (owner). v2.3.1379: north rebuilt on armor-anchored cuts (sliver flicker); SW f1 gray arcs stripped. v2.3.1378: SW f0-f2/f13-f14 helmet-edge leftovers shaved to the armor shelf (owner). v2.3.1377: southwest fullset rebuilt on armor-anchored per-frame neck cuts (owner frame list). v2.3.1373: chest hem belt extended a few px down (south/southwest/
   north) so chest-only wear never flashes tan belly between hem and trousers; east fullset interior
   seam lines lifted toward soft gray ("too thick of black outlines"). */
/* v2.3.1372: hip-skirt (thigh plate) pixels stripped BACK OUT of the
   south/southwest/north jog chest sheets (restored to the v2.3.1345b belt-stripped originals).  The
   v2.3.1348b "restored hip skirt" baked the mannequin's silver skirt into the CHEST sheet, so a player
   wearing ONLY the chest plate showed leg armor on bare thighs (owner report).  Full-set on these dirs
   uses the fullset figure and never draws this sheet; NE/NW full-set gets its thigh cover from the
   LEGS sheet, so nothing else changes. */
/* v2.3.1345: baked jog belts STRIPPED from all five chest sheets — the
   chain belt is now a runtime layer (see getJogBeltTexture + entityRenderer._placeGear); six rounds of
   baking/sealing it into the sheets each produced a new on-device artifact.
   BUMP THIS on EVERY gear-art regen — v2.3.1342c changed the PNGs without bumping, so
   previews served the cached old art and the change was invisible on-device. */

/* `${slot}/${item}/${pose}/${dir}` -> [Texture] | 'loading' | [] (missing) */
const _sheets = {};

/* v2.3.1122: WebP-preferring load (PNG fallback) for the gear sheets. */
function loadImg(url) { return loadWebpOrPng(url); }

/* v2.3.1305: bounded retry on gear-sheet load failure.  A flaked request
   (deploy-day cold CDN edge / dropped mobile request) used to cache []
   permanently and hide that gear slot for that (pose,dir) all session —
   part of the owner's "clothes missing depending on the angle" report.
   The entry stays 'loading' across the backoff so callers keep their
   graceful null fallback; the retry URL appends &r=N to bypass a
   poisoned cache entry.  Deliberately NO crash-telemetry here: partial
   pose sets are by design (fish/pickup ship south only), so a final
   failure is only distinguishable from expected-missing art by eye —
   flip window.__spriteLog = true to see them. */
const _GEAR_RETRY_MS = [2000, 6000];
function buildSheet(key, slot, item, pose, dir, attempt = 0) {
  _sheets[key] = 'loading';
  /* Returns a promise that ALWAYS resolves (missing sheet -> []), so callers
     that want to await a full preload don't hang on a 404. */
  const bust = attempt > 0 ? `&r=${attempt}` : '';
  return loadImg(`/sprites/gear/${slot}/${item}/${pose}-${dir}.png?v=${GEAR_VERSION}${bust}`).then(rawImg => {
    /* restore a downscaled-on-disk gear sheet to the 256px frame (no-op for any
       native >=256 sheet, so the variable-height combat poses are untouched) */
    const rawH = rawImg.naturalHeight || rawImg.height || 0;
    /* v2.3.1120: gear stays at the FULL 256 frame (NOT display-downscaled like the
       body).  Gear is also consumed by the combat swing/bowshot stand-ins
       (effectsRenderer) at 256, so downscaling it here would shrink the legs there;
       instead the MAIN renderer's _placeGear divides the body transform by
       DISPLAY_DS to render this 256 gear at the right size over the smaller body.
       v2.3.1341 (owner: the chain belt / armor edges SHIMMER while jogging): the
       v2.3.1237 anti-alias cure was only ever applied to the BODY sheets, so
       128px-on-disk gear rendered with raw nearest-upscale stair-steps that
       crawl sub-pixel in motion.  antialiasUpscaledCanvas is the SAME resample,
       but size-preserving — the 256 contract above still holds (unlike
       bakeDisplayCanvas, which would shrink gear if DISPLAY_DS ever went back
       to 2).  Native >=256 sheets pass through untouched. */
    /* v2.3.1408 (DISPLAY_DS=2): the FULLSET figure sheets are display-
       downscaled like the body, NOT kept at the 256 gear contract.  The
       figure texture is assigned directly onto the body sprite
       (entityRenderer _fullsetFrame -> spriteBody.texture), whose
       transform expects display-sized frames — this is exactly why the
       figure path used to be guarded to DISPLAY_DS === 1.  Storing the
       fullset at display size makes the figure a drop-in body frame at
       any DS, so the guards lift and the painted knight stays on the
       figure path.  Overlay/combat gear sheets keep the full-256
       contract (the note above still holds for them).  fw/fh track the
       scaled frame for slicing. */
    /* v2.3.1434 (frost OOM report: "crashed after harvesting different
       resources over a short period"): the exact-texel treatment extends
       from the fullset figures to EVERY gear sheet that ships at the
       display size on disk (jog/stand/pickup/fish steel sheets are all
       128px-tall art; the "full 256" was always a nearest-neighbour
       pixel-double of these texels).  Storing them raw at 128 removes
       ~60MB of resident upscale canvases at DS=2 with the artist's
       exact pixels — the same owner-approved recipe as v2.3.1412 —
       and halves the lazy fish/mine harvest-pose loads that stacked
       the frost-zone peak back to the iOS kill line.  Consumers are
       size-agnostic: the masked bake stretch-draws by source rect, and
       _placeGear (entityRenderer) now normalizes by the texture's own
       frame width.  Sheets shipping any OTHER height (bowshot/cook/
       chop combat stand-in strips, 256-native art) keep the full-256
       contract unchanged. */
    const _fsDs = (slot === 'fullset' || (DISPLAY_DS > 1 && rawH === FRAME_H / DISPLAY_DS)) ? DISPLAY_DS : 1;
    let img;
    if (_fsDs > 1 && rawH === FRAME_H / _fsDs) {
      /* v2.3.1412 (owner: "the half res texture looks soft — it's a very
         simple armor sprite, maybe it can be compressed differently").
         The steel figure sheets ship 128px ON DISK — the 256 "full res"
         was always a nearest-neighbour 2x pixel-double of these texels.
         The v2.3.1408 pipeline (NN-upscale 128->256, anti-alias, Lanczos
         back down to 128) double-resampled the art into mush.  When the
         on-disk height already IS the display size, slice the RAW image
         untouched: the texture is the artist's exact pixels, same memory,
         no resampling anywhere. */
      img = rawImg;
    } else {
      img = antialiasUpscaledCanvas(upscaleToFrameHeight(rawImg, FRAME_H), rawH);
      if (_fsDs > 1) img = downscaleByFactor(img, _fsDs);
    }
    const fw = FRAME_W / _fsDs, fh = FRAME_H / _fsDs;
    const src = Texture.from(img).source;
    src.scaleMode = 'linear';
    /* v2.3.1385: the v2.3.1384 fullset mips-off (invisible-knight memory
       guess) came RIGHT BACK as "lines are blurry and wobbly behind the
       character while running east" — on a 3x-DPR phone the strip renders
       slightly minified in device pixels, exactly where mips matter.
       Restored; the invisible-knight hunt rides on the v2.3.1384 telemetry
       (gear-sheet-failed / body-sheet-failed + GL caps) instead. */
    src.autoGenerateMipmaps = true;
    const frames = Math.max(1, Math.floor(img.width / fw));
    const out = [];
    for (let i = 0; i < frames; i++) {
      out.push(new Texture({ source: src, frame: new Rectangle(i * fw, 0, fw, fh) }));
    }
    _sheets[key] = out;
  }).catch(() => {
    if (attempt < _GEAR_RETRY_MS.length) {
      /* v2.3.1398: retry CHAINS into the returned promise so the intro
         gate (preloadGear/preloadFullsetFigures awaiters) waits through
         the backoff instead of passing with a sheet still re-fetching. */
      return new Promise((res) => setTimeout(res, _GEAR_RETRY_MS[attempt]))
        .then(() => buildSheet(key, slot, item, pose, dir, attempt + 1));
    }
    _sheets[key] = []; /* missing -> caller hides the slot */
    try { if (window.__spriteLog) console.warn('[sprite] gear sheet failed', key); } catch (e) { /* ignore */ }
    /* v2.3.1384: a FINAL failure on a sheet that must exist (the fullset
       knights and their jog belts) is real evidence for an invisible /
       misdressed character — land it in the crash ring so on-device
       reports arrive with facts.  Poses that legitimately 404 (fish/
       pickup non-south) never reach here with these slots. */
    if (slot === 'fullset' || slot === 'belt') {
      try { import('../debug/crashTrap.js').then(ct => ct.recordCrash('gear-sheet-failed', key)).catch(() => {}); } catch (e) { /* ignore */ }
    }
  });
}

/** Frame texture for an equipped piece, or null while loading / if missing /
 *  if nothing is equipped in the slot.  Lazy-baked + cached per (slot,item,
 *  pose,dir).  The caller (entityRenderer) passes the BASE dir + body frameIdx
 *  and copies the body sprite's transform, which carries mirror + bodyScale. */
export function getGearFrame(slot, item, pose, dir, frameIdx) {
  if (!item || item === 'none') return null;
  const key = slot + '/' + item + '/' + pose + '/' + dir;
  const entry = _sheets[key];
  if (entry === undefined) { buildSheet(key, slot, item, pose, dir); return null; }
  if (entry === 'loading' || !entry.length) return null;
  return entry[((frameIdx % entry.length) + entry.length) % entry.length];
}

/** v2.3.1367: frame by CYCLE PHASE (0..1) instead of a body frame index —
 *  for sheets whose frame count differs from the body cycle's (the east
 *  fullset ships its native 25 frames vs the 28-frame body cycle; owner:
 *  "cut the animation cycle down to the frame count instead of extending
 *  it").  Each sheet frame plays exactly once per cycle, evenly spaced on
 *  the same clock, so there are no held/duplicated frames and no wrap
 *  jump. */
export function getGearFramePhased(slot, item, pose, dir, phase) {
  if (!item || item === 'none') return null;
  const key = slot + '/' + item + '/' + pose + '/' + dir;
  const entry = _sheets[key];
  if (entry === undefined) { buildSheet(key, slot, item, pose, dir); return null; }
  if (entry === 'loading' || !entry.length) return null;
  const p = ((phase % 1) + 1) % 1;
  return entry[Math.min(entry.length - 1, Math.floor(p * entry.length))];
}

/* v2.3.1345: the jog chain belt ships as its own gear sheet
   (belt/chainbelt/jog-<dir>.png, generated by tools/gen_jog_belt_table.py,
   clipped to the body silhouette per frame) and loads through the normal
   buildSheet path above — entityRenderer requests
   getGearFrame('belt', 'chainbelt', 'jog', dir, frameIdx) and draws it on a
   dedicated sprite BELOW gearLegs.  A missing sheet degrades gracefully
   (belt hidden; the pants band still covers the seam). */

/** v2.3.1376: preload the pre-composed FULLSET knight figures (jog
 *  south/southwest/north/east) — they replace the whole armored body when
 *  the full steel set is worn, and a lazy first fetch hitched the first
 *  armored jog per direction (animation-preload law, CLAUDE.md v2.3.1358).
 *  Missing dirs (northeast keeps the classic composite) resolve to [] and
 *  cost one 404 at load time. */
export function preloadFullsetFigures() {
  const tasks = [];
  for (const dir of ['south', 'southwest', 'north', 'east']) {
    const key = 'fullset/steel/jog/' + dir;
    if (_sheets[key] === undefined) tasks.push(buildSheet(key, 'fullset', 'steel', 'jog', dir));
  }
  return Promise.all(tasks);
}

/** Unique TextureSources of every gear sheet baked so far (idle/jog stand sets).
 *  Lets the renderer force-GPU-upload them during the loading screen (mirrors
 *  the masked-body uploadBakedTextures) so a first armored turn doesn't pay a
 *  lazy first-draw upload.  All frames of a sheet share one source. */
export function getLoadedGearSources() {
  const sources = new Set();
  for (const entry of Object.values(_sheets)) {
    if (Array.isArray(entry) && entry.length && entry[0] && entry[0].source) {
      sources.add(entry[0].source);
    }
  }
  return sources;
}

/** Pre-bake a slot's spawn-pose sheets (all base dirs) to avoid a first-frame
 *  gap, mirroring playerSkins.prewarmBody. */
export function prewarmGear(slot, item) {
  if (!item || item === 'none') return;
  for (const dir of ['east', 'north', 'northeast', 'south', 'southwest']) {
    const key = slot + '/' + item + '/stand/' + dir;
    if (_sheets[key] === undefined) buildSheet(key, slot, item, 'stand', dir);
  }
}

/** Preload EVERY (pose, dir) sheet for EVERY catalog gear item so the
 *  armoured figure never falls back to the bare body when the player first
 *  turns/jogs in a fresh direction (the gear sheets were previously lazy-
 *  loaded on first use, which read as an armour->unarmoured flicker).
 *  Returns a promise that resolves once all sheets are baked (or 404'd).
 *  Poses limited to those the gear set actually ships (stand + jog) to avoid
 *  spurious 404s; extend if a gear item gains hit/attack sheets. */
export function preloadGear() {
  const POSES = ['stand', 'jog'];
  const DIRS = ['east', 'north', 'northeast', 'south', 'southwest'];
  const tasks = [];
  for (const slot of GEAR_SLOTS) {
    /* v2.3.1197: preload EVERY catalog item per slot, not just the currently
       equipped one. Equipping owned armour after spawn used to fetch+slice the
       sheet on the main thread (the equip stutter / armour flicker). The gear
       catalog is tiny (one armour set), so this adds little to the loading
       screen and matches what preloadCombatGear() already does for swings. */
    for (const c of (GEAR_CATALOG[slot] || [])) {
      const item = c && c.id;
      if (!item || item === 'none') continue;
      for (const pose of POSES) {
        for (const dir of DIRS) {
          const key = slot + '/' + item + '/' + pose + '/' + dir;
          if (_sheets[key] === undefined) tasks.push(buildSheet(key, slot, item, pose, dir));
        }
      }
    }
  }
  return Promise.all(tasks);
}
