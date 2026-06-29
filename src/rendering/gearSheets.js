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
import { GEAR_SLOTS, getEquip } from './gearCatalog.js';
import { upscaleToFrameHeight } from './spriteScale.js'; /* v2.3.1110: restore downscaled gear sheets to the 256px frame */

const FRAME_W = 256;
const FRAME_H = 256;
/* v2.3.708: NE jog gear re-painted on the new 24-frame body cycle (see
   playerSprites VERSION 69); chain belt re-baked into the chest sheet. */
/* v2.3.748: + shirt/tshirt white-base sheets (all 5 base dirs by v2.3.754). */
/* v2.3.1053: + pickup-south sheets for chest/steelplate, legs/steelgreaves,
   and shirt/tshirt -- the loot-pickup freeze pose now shows the recoloured
   shirt + equipped plate instead of the bare body (owner-drawn art). */
/* v2.3.1054: pickup greaves rescaled +25% (owner) -- bump to refetch the PNG. */
const GEAR_VERSION = '2.3.1054';

/* `${slot}/${item}/${pose}/${dir}` -> [Texture] | 'loading' | [] (missing) */
const _sheets = {};

function loadImg(url) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = url;
  });
}

function buildSheet(key, slot, item, pose, dir) {
  _sheets[key] = 'loading';
  /* Returns a promise that ALWAYS resolves (missing sheet -> []), so callers
     that want to await a full preload don't hang on a 404. */
  return loadImg(`/sprites/gear/${slot}/${item}/${pose}-${dir}.png?v=${GEAR_VERSION}`).then(rawImg => {
    /* restore a downscaled-on-disk gear sheet to the 256px frame (no-op for any
       native >=256 sheet, so the variable-height combat poses are untouched) */
    const img = upscaleToFrameHeight(rawImg, FRAME_H);
    const src = Texture.from(img).source;
    src.scaleMode = 'linear';
    src.autoGenerateMipmaps = true;
    const frames = Math.max(1, Math.floor(img.width / FRAME_W));
    const out = [];
    for (let i = 0; i < frames; i++) {
      out.push(new Texture({ source: src, frame: new Rectangle(i * FRAME_W, 0, FRAME_W, FRAME_H) }));
    }
    _sheets[key] = out;
  }).catch(() => { _sheets[key] = []; /* missing -> caller hides the slot */ });
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

/** Preload EVERY (pose, dir) sheet for the currently-equipped gear so the
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
    const item = getEquip(slot);
    if (!item || item === 'none') continue;
    for (const pose of POSES) {
      for (const dir of DIRS) {
        const key = slot + '/' + item + '/' + pose + '/' + dir;
        if (_sheets[key] === undefined) tasks.push(buildSheet(key, slot, item, pose, dir));
      }
    }
  }
  return Promise.all(tasks);
}
