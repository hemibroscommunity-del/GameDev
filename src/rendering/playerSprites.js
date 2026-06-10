/* Player sprite-sheet loader for the Pixi renderer.
 *
 * Mirrors the data layout that BroTown.jsx populates into
 * `playerSpritesRef.current` for the Canvas 2D path:
 *   - 5 source directions × 3 poses = 15 sheets
 *   - directions: east, north, northeast, south, southwest
 *     (west / northwest / southeast are rendered by horizontal mirror)
 *   - poses: stand (1 frame), jog (24 frames), hit (6 frames)
 *   - each frame is 64×64 inside a horizontal strip
 *
 * The Canvas 2D path uses ctx.drawImage() with sub-rect crop; Pixi
 * needs per-frame Textures.  We load each sheet via Assets, then
 * carve it into N Texture instances pointing at the same source with
 * different frame rectangles.  Lookup is `getFrame(pose, dir, idx)`.
 *
 * `cycleMs(pose, dir)` returns the per-direction animation duration —
 * jog cycles vary by direction (east ~1.0s, south ~2.0s, …) so the
 * walk loop matches the original source-video cadence.
 */

import { Assets, Rectangle, Texture } from 'pixi.js';

/* v2.3.166: bumped from 128 to 256 per user request.  256 source +
   plain Lanczos (no outline overlay) gives a more naturally-rendered
   outline (the 128 + outline-overlay path was "over processed").
   Hit sheets nearest-upscaled 128 -> 256 to match. */
const FRAME_W = 256;
const FRAME_H = 256;
/* JOG sheets now have VARIABLE frame counts per direction (north 24,
   south 31, northeast 25, southwest 35, east 24-ish).  Frame count is
   detected from the loaded texture width (sheet width / FRAME_W).
   stand/hit stay fixed since their sheets have known shapes. */
const STAND_FRAMES = 1;
const HIT_FRAMES = 6;
const ATTACK_FRAMES = 2;

/* Base 1 s jog cycle.  Per-direction overrides reflect the cadence
   the user dialed in: north / south slowed so the legs don't blur,
   northeast / northwest sped up because the new source video runs at
   a slower gait than feels right.  (NW is a horizontal mirror of NE,
   so it shares NE's cycle.) */
const JOG_DURATION_MS = 1000;
const JOG_DURATION_BY_DIR = {
  /* v2.3.535 pacing pass (armored run): N/S +50% speed (1400->933),
     NE/NW -50% speed (938->1876), SW/SE +15% speed (2000->1739),
     east unchanged (user: "east is perfect").  Mirror dirs share the
     same cycle: W from E, NW from NE, SE from SW. */
  /* v2.3.543: north +5% (848->808), south +10% (933->848), NE/NW +10%
     (1563->1421), SW/SE +5% (1739->1656).  east unchanged.
     v2.3.544: south +3% more (848->823).
     v2.3.578: NE/NW +60% speed (1421->888) — the diagonal run read too
     slow.  NW mirrors NE, so both speed up together.
     v2.3.589: NE/NW -50% speed (888->1776) per user — the diagonal run
     was playing too fast.  NW mirrors NE, so both slow together.
     v2.3.598: NE/NW +50% speed (1776->1184) per user — 1776 read too slow;
     1.5x quicker, between the old fast (888) and slow (1776). NW mirrors NE.
     v2.3.601: NE/NW +35% speed (1184->877) per user. NW mirrors NE.
     v2.3.707: the v2.3.706 +50% pass (877->585) was reverted same-day; 877
     stands, and the armored NE override is gone -- naked and armored now
     share this value (see JOG_DURATION_ARMORED_BY_DIR). NW mirrors NE. */
  north: 808,
  south: 823,
  northeast: 877,
  east: 900,
  southwest: 1656,
};
/* v2.3.603: ARMOURED overrides -- when wearing the armour set the NE/NW jog
   keeps its pre-v2.3.601 cadence (the +35% naked speed-up doesn't apply). NW
   mirrors NE.  Dirs absent here use JOG_DURATION_BY_DIR regardless of armour. */
/* v2.3.707: emptied -- the armored NE/NW cadence now matches the naked one
   (877, JOG_DURATION_BY_DIR).  The v2.3.603 split (armored kept the slower
   pre-v2.3.601 cadence for a heavier-in-plate feel) was a tuning choice that
   no longer applies on the v2.3.705 half-cycle sheets.  The armour-aware
   mechanism stays for future per-dir overrides. */
const JOG_DURATION_ARMORED_BY_DIR = {};
const HIT_DURATION_MS = 250;
/* v2.3.188: pickup pose plays during the 0.5 s loot-pickup freeze.
   One sheet, south-only (facing is force-locked to 'down' during the
   freeze, see BroTown.jsx:5297). */
const PICKUP_DURATION_MS = 500;
/* v2.3.236: 2-frame raised-fist + punch-out attack sheet per dir.
   Cycle is the full windup→strike read: ~100 ms hold on the windup
   (frame 0), ~120 ms on the strike (frame 1), so the whole pose
   reads in ~220 ms.  Renderer freezes the player at frame 0 during
   windup and frame 1 during the strike. */
const ATTACK_DURATION_MS = 220;
/* Life-skill mining swing: south-only (facing locks to 'down' while
   gathering, same as pickup), ~14-frame loop carved from the Grok clip.
   See docs/skill-animation-pipeline.md. */
const MINE_DURATION_MS = 650;

const SOURCE_DIRS = ['east', 'north', 'northeast', 'south', 'southwest'];
const POSES = ['stand', 'jog', 'hit', 'pickup', 'attack', 'mine'];

/* v68 (v2.3.705): jog-east + jog-northeast rebuilt as HALF-CYCLE LOOPS.  The
   AI armor pass couldn't keep limb identity through the second arm/leg
   crossover (the arms "repelled" instead of swinging through), so the sheet
   now carries ONE clean half-stride played twice -- visually identical on a
   symmetric figure, and the gait alternation is implied.  East = old frames
   0-13 doubled (28); NE = old frames 8-15 doubled (16), which also drops the
   two worst frame-pops the old NE cycle had (7->8 and 15->0).  Gear sheets +
   anchors/body-tops/body-anchors were remapped to the same frame order. */
const VERSION = 68; /* v67 cleaned interior white gaps in mine-south */
/* Re-exported so the skin-recolor pipeline (playerSkins.js) loads the same
   cache-busted sheet URLs and never drifts onto a stale cached image. */
export const SPRITE_VERSION = VERSION;

/* The loaded manifest:
 *   { stand: { east: [Texture], … }, jog: { east: [Texture×24], … }, hit: { east: [Texture×6], … } }
 * Filled in as load() resolves each sheet.  Lookups before load is
 * complete return null — entityRenderer falls back to procedural
 * Graphics until the manifest populates.
 */
const manifest = {
  stand: {}, jog: {}, hit: {}, pickup: {}, attack: {}, mine: {},
};

let loadPromise = null;

function spriteUrl(pose, dir) {
  return `/sprites/player/${pose}-${dir}.png?v=${VERSION}`;
}

/* Resolve frame count for a (pose, dir) sheet from the loaded texture
   width when available — jog sheets vary per direction (24-35 frames)
   so we can't hardcode.  Falls back to fixed counts for stand/hit. */
function deriveFrameCount(pose, tex) {
  const width = (tex && tex.source && tex.source.width) || 0;
  if (pose === 'jog' || pose === 'pickup' || pose === 'mine') return Math.max(1, Math.floor(width / FRAME_W));
  if (pose === 'hit') return HIT_FRAMES;
  if (pose === 'attack') return ATTACK_FRAMES;
  return STAND_FRAMES;
}

async function loadSheet(pose, dir) {
  const url = spriteUrl(pose, dir);
  try {
    const tex = await Assets.load(url);
    if (!tex || !tex.source) return;
    /* v2.3.163: switch the texture-source sampler to LINEAR and
       enable mipmaps so the 128-px source downscales smoothly to the
       64-ish display target.  Without this, PIXI's default NEAREST
       sampler produces blocky half-rate output and the higher-res
       source is wasted. */
    tex.source.scaleMode = 'linear';
    tex.source.autoGenerateMipmaps = true;
    const frames = deriveFrameCount(pose, tex);
    const out = [];
    for (let i = 0; i < frames; i++) {
      out.push(new Texture({
        source: tex.source,
        frame: new Rectangle(i * FRAME_W, 0, FRAME_W, FRAME_H),
      }));
    }
    manifest[pose][dir] = out;
  } catch {
    /* Sheet missing — leave undefined, caller falls back to procedural. */
  }
}

/** Kick off all 15 sheet loads.  Idempotent; returns the same promise
 *  on subsequent calls so callers can `await loadPlayerSprites()`. */
export function loadPlayerSprites() {
  if (loadPromise) return loadPromise;
  const tasks = [];
  for (const pose of POSES) {
    for (const dir of SOURCE_DIRS) {
      /* pickup and mine are south-only -- facing locks to 'down' during
         the loot-pickup freeze / mining gather, so we only ship one sheet
         and skip the other dir slots to avoid 404s. */
      if ((pose === 'pickup' || pose === 'mine') && dir !== 'south') continue;
      tasks.push(loadSheet(pose, dir));
    }
  }
  loadPromise = Promise.all(tasks);
  return loadPromise;
}

/** Resolve a `facing` string into a (dir, mirror) for the sprite path.
 *  Accepts both the 4-cardinal values that BroTown's input system
 *  actually emits ('up'/'down'/'left'/'right') AND the 8-direction
 *  compass names if a future caller supplies them.
 */
export function resolveDirection(facing) {
  switch (facing) {
    /* 4-cardinal — what S._facing currently uses. */
    case 'right':      return { dir: 'east',       mirror: false };
    case 'left':       return { dir: 'east',       mirror: true };
    case 'up':         return { dir: 'north',      mirror: false };
    case 'down':       return { dir: 'south',      mirror: false };
    /* 8-compass — for any path that fills in diagonals. */
    case 'east':       return { dir: 'east',       mirror: false };
    case 'west':       return { dir: 'east',       mirror: true };
    case 'north':      return { dir: 'north',      mirror: false };
    case 'south':      return { dir: 'south',      mirror: false };
    case 'northeast':  return { dir: 'northeast',  mirror: false };
    case 'northwest':  return { dir: 'northeast',  mirror: true };
    case 'southwest':  return { dir: 'southwest',  mirror: false };
    case 'southeast':  return { dir: 'southwest',  mirror: true };
    default:           return { dir: 'south',      mirror: false };
  }
}

/** Pick the right Texture for (pose, dir, frameIdx).  Returns null if
 *  the sheet hasn't loaded yet — caller should fall back to procedural
 *  rendering for that frame. */
export function getFrame(pose, dir, frameIdx) {
  const set = manifest[pose] && manifest[pose][dir];
  if (!set || set.length === 0) return null;
  const safeIdx = ((frameIdx % set.length) + set.length) % set.length;
  return set[safeIdx];
}

/** How long the full animation cycle takes in ms for the given
 *  (pose, dir).  Jog defaults to JOG_DURATION_MS with a per-direction
 *  override map (e.g. northeast plays faster); stand is a 1s
 *  placeholder; hit is 250ms. */
export function cycleMs(pose, dir, armored) {
  if (pose === 'jog') {
    /* v2.3.603: the NE/NW jog speed-up (v2.3.601, +35%) is for the NAKED body
       only; the armoured figure keeps its prior (slower) cadence.  So jog
       duration is armour-aware for the dirs in JOG_DURATION_ARMORED_BY_DIR. */
    if (armored && JOG_DURATION_ARMORED_BY_DIR[dir] != null) return JOG_DURATION_ARMORED_BY_DIR[dir];
    return JOG_DURATION_BY_DIR[dir] || JOG_DURATION_MS;
  }
  if (pose === 'hit') return HIT_DURATION_MS;
  if (pose === 'pickup') return PICKUP_DURATION_MS;
  if (pose === 'attack') return ATTACK_DURATION_MS;
  if (pose === 'mine') return MINE_DURATION_MS;
  return 1000;
}

/** Frame count for a loaded (pose, dir) sheet.  Renderer uses this
 *  for jog so it can pick frameIdx based on the actual strip length
 *  instead of a hardcoded 24 (sheets are now variable: 24-35). */
export function frameCount(pose, dir) {
  const set = manifest[pose] && manifest[pose][dir];
  return set ? set.length : 0;
}

/** True if at least one sheet for the given pose has loaded.  Cheap
 *  check the renderer can use to gate the sprite path. */
export function hasPose(pose) {
  if (!manifest[pose]) return false;
  for (const dir of SOURCE_DIRS) {
    if (manifest[pose][dir]) return true;
  }
  return false;
}
