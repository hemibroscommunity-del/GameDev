/* ═══ v2.3.4355: THE WATER FROG -- THE WATER CAVES' MONSTER ═══
 *
 * The owner, 2026-11-09: "I added new monster (water frog) on GitHub. It
 * included videos of 5 directions: idle, attack, movement, and death
 * animation (only South). Can you cut it into the right amount of frames to
 * make it look smooth and wire it into the game? I want to replace the fish
 * man monster."
 *
 * It wears the fishman's variant key (`fishman`: the worker's name for the
 * Water Caves' brute, on the wire and in every saved codex, so it stays), and
 * is the first of the brutes with strips of its own for everything it does.
 * The bog lurker still draws the old fishman pictures (fishmanSprites.js).
 *
 * The strips (public/sprites/monsters/water-frog/, rows of 256 px cells on
 * 256 colours, cut by tools/art/cut_water_frog.py from the owner's videos):
 *   idle-{s|sw|e}.png      8 frames: one breath, looping
 *   hop-{s|sw|e}.png      12 frames: crouch, spring, the air, the landing
 *   attack-{s|sw|e}.png   15 frames: 12 of wind-up (the last is the blow),
 *                         then ATTACK_RECOVER of recovery
 *   death.png             20 frames, facing you: its water sac spins up and
 *                         bursts, and it is left flat in the puddle
 *   idle-, hop-, attack-{n|ne}.png   the two sides the videos do not show,
 *                         made from the still picture of each (1, 8 and 9
 *                         frames): replaced when their videos arrive
 *
 * Five sides are drawn (front, front-left, side facing right, back,
 * back-right); the other three are those mirrored.  Lookups give
 * { tex, mirror } or null until the strip has loaded.
 */
import { loadTrackedStrip, unloadBundle } from './zoneTextures.js';

const FRAME_W = 256;
const FRAME_H = 256;
/* Bump on every change to the pictures, so the edge cache serves the new ones. */
const SPRITE_VERSION = '2.3.4355';
const DIR = '/sprites/monsters/water-frog';
const BUNDLE = 'waterFrog';

export const WATER_FROG_DIRS = Object.freeze(['s', 'sw', 'e', 'n', 'ne']);
/* the frames at the END of every attack strip that play after the blow */
export const ATTACK_RECOVER = 3;

/* which strip a facing is drawn from, and whether mirrored (the side view
   faces right, the front-left view left, the back-right view right) */
export const WATER_FROG_FACING = Object.freeze({
  south:     { src: 's',  mirror: false },
  southwest: { src: 'sw', mirror: false },
  west:      { src: 'e',  mirror: true },
  northwest: { src: 'ne', mirror: true },
  north:     { src: 'n',  mirror: false },
  northeast: { src: 'ne', mirror: false },
  east:      { src: 'e',  mirror: false },
  southeast: { src: 'sw', mirror: true },
});

const idleSheets = {};
const hopSheets = {};
const attackSheets = {};
let deathFrames = [];
let loadPromise = null;

async function loadStrip(name, into, key) {
  try {
    const frames = await loadTrackedStrip(BUNDLE, `${DIR}/${name}.png?v=${SPRITE_VERSION}`, FRAME_W, FRAME_H);
    if (frames.length) into[key] = { frames };
  } catch { /* a missing strip: the lookup falls back to the front one */ }
}

export function loadWaterFrogSprites() {
  if (loadPromise) return loadPromise;
  const tasks = [];
  for (const d of WATER_FROG_DIRS) {
    tasks.push(loadStrip(`idle-${d}`, idleSheets, d));
    tasks.push(loadStrip(`hop-${d}`, hopSheets, d));
    tasks.push(loadStrip(`attack-${d}`, attackSheets, d));
  }
  tasks.push((async () => {
    try {
      const frames = await loadTrackedStrip(BUNDLE, `${DIR}/death.png?v=${SPRITE_VERSION}`, FRAME_W, FRAME_H);
      /* (assigned whole: a load that lands after an unload must not append
         to the next load's frames) */
      if (frames.length) deathFrames = frames;
    } catch { /* missing: the renderer's cut deaths play */ }
  })());
  loadPromise = Promise.all(tasks);
  return loadPromise;
}

function sheetFor(sheets, facing) {
  const m = WATER_FROG_FACING[facing] || WATER_FROG_FACING.south;
  const sheet = sheets[m.src];
  if (sheet && sheet.frames.length) return { sheet, mirror: m.mirror };
  /* not loaded (yet): the front strip, then any, so the frog is never the
     stand-in circle for the frames a strip takes to arrive */
  if (sheets.s && sheets.s.frames.length) return { sheet: sheets.s, mirror: false };
  for (const k of Object.keys(sheets)) if (sheets[k].frames.length) return { sheet: sheets[k], mirror: false };
  return null;
}
function lookup(sheets, facing, frameIdx) {
  const s = sheetFor(sheets, facing);
  if (!s) return null;
  const len = s.sheet.frames.length;
  return { tex: s.sheet.frames[((frameIdx % len) + len) % len], mirror: s.mirror, scaleMult: 1 };
}
function countOf(sheets, facing) {
  const s = sheetFor(sheets, facing);
  return s ? s.sheet.frames.length : 0;
}

/* the hop: the frog's walk */
export function getFrame(facing, frameIdx) { return lookup(hopSheets, facing, frameIdx); }
export function frameCount(facing) { return countOf(hopSheets, facing); }
export function hasFrames() { return Object.keys(hopSheets).length > 0; }

export function getIdleFrame(facing, frameIdx) { return lookup(idleSheets, facing, frameIdx); }
export function idleFrameCount(facing) { return countOf(idleSheets, facing); }
export function hasIdleFrames() { return Object.keys(idleSheets).length > 0; }

export function getAttackFrame(facing, frameIdx) { return lookup(attackSheets, facing, frameIdx); }
export function attackFrameCount(facing) { return countOf(attackSheets, facing); }
export function hasAttackFrames() { return Object.keys(attackSheets).length > 0; }

/* the death: one strip, facing you, played once and held on its last frame */
export function getDeathFrame(frameIdx) {
  if (!deathFrames.length) return null;
  return deathFrames[Math.max(0, Math.min(deathFrames.length - 1, frameIdx))];
}
export function deathFrameCount() { return deathFrames.length; }
export function hasDeathFrames() { return deathFrames.length > 0; }

/* Let it all go (preloadAnimations freeZoneAssets, wheelMonsterArt freeLook):
   the memoised promise cleared too, so the next load is a real one. */
export function unloadWaterFrogSprites() {
  loadPromise = null;
  for (const k in idleSheets) delete idleSheets[k];
  for (const k in hopSheets) delete hopSheets[k];
  for (const k in attackSheets) delete attackSheets[k];
  deathFrames = [];
  return unloadBundle(BUNDLE);
}
