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
 *   idle-{s|sw|e|ne}.png      8 frames: one breath, looping
 *   hop-{s|sw|ne}.png        12 frames: crouch, spring, the air, the landing
 *   attack-{s|sw|e|ne}.png   15 frames: 12 of wind-up (the last is the blow),
 *                            then ATTACK_RECOVER of recovery
 *   death.png                20 frames, facing you: its water sac spins up
 *                            and bursts, and it is left flat in the puddle
 *   idle-n, hop-n, attack-n.png   from behind, which no video shows: made
 *                            from the still picture (1, 8 and 9 frames)
 *
 * NO WATER LEAVES THE FROG IN A STRIP (the owner: "I intend for you to draw
 * the water attacks in code actually. Don't use the water in the drawings"):
 * what it spits is rendering/waterAttackFx.js's, drawn as the blow lands.
 *
 * Five sides are drawn (front, front-left, side facing right, back-right,
 * back); the other three are those mirrored.  The side view has no hop of
 * its own (its video left the frame), so a frog going east or west stands
 * and attacks side on and hops on the back-right strip, the nearest view.
 * Lookups give { tex, mirror } or null until the strip has loaded.
 */
import { loadTrackedStrip, unloadBundle } from './zoneTextures.js';
import { wantWaterAttack } from './waterAttackFx.js';   /* v2.3.4389: its water's sprites come and go with its look */

const FRAME_W = 256;
const FRAME_H = 256;
/* Bump on every change to the pictures, so the edge cache serves the new ones. */
const SPRITE_VERSION = '2.3.4359';   /* v2.3.4359: re-cut on the monster's one shared list of 256 colours */
const DIR = '/sprites/monsters/water-frog';
const BUNDLE = 'waterFrog';

/* the sides each kind of strip was cut for */
export const WATER_FROG_STRIPS = Object.freeze({
  idle: Object.freeze(['s', 'sw', 'e', 'ne', 'n']),
  hop: Object.freeze(['s', 'sw', 'ne', 'n']),
  attack: Object.freeze(['s', 'sw', 'e', 'ne', 'n']),
});
/* the frames at the END of every attack strip that play after the blow */
export const ATTACK_RECOVER = 3;

/* which strip a facing is drawn from, and whether mirrored (the side and
   back-right views face right, the front-left view left) */
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
/* ...and the hop's: east and west on the back-right strip (no side hop) */
export const WATER_FROG_HOP_FACING = Object.freeze({
  ...WATER_FROG_FACING,
  west: { src: 'ne', mirror: true },
  east: { src: 'ne', mirror: false },
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
  wantWaterAttack(true);
  if (loadPromise) return loadPromise;
  const tasks = [];
  for (const d of WATER_FROG_STRIPS.idle) tasks.push(loadStrip(`idle-${d}`, idleSheets, d));
  for (const d of WATER_FROG_STRIPS.hop) tasks.push(loadStrip(`hop-${d}`, hopSheets, d));
  for (const d of WATER_FROG_STRIPS.attack) tasks.push(loadStrip(`attack-${d}`, attackSheets, d));
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
  const map = sheets === hopSheets ? WATER_FROG_HOP_FACING : WATER_FROG_FACING;
  const m = map[facing] || map.south;
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
  wantWaterAttack(false);
  loadPromise = null;
  for (const k in idleSheets) delete idleSheets[k];
  for (const k in hopSheets) delete hopSheets[k];
  for (const k in attackSheets) delete attackSheets[k];
  deathFrames = [];
  return unloadBundle(BUNDLE);
}
