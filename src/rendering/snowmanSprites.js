/* Snowman monster sprite loader for the Pixi renderer.
 *
 * 8-direction animated idle loops.  5 source PNGs (south, southwest,
 * east, north, northeast) at /sprites/monsters/snowman/snowman-{s|sw|
 * e|n|ne}.png.  Each is a horizontal strip of 128×128 frames; frame
 * count is auto-detected from the loaded texture width so we can swap
 * art with different counts without touching this file.  The
 * remaining 3 facings (west, northwest, southeast) reuse the
 * corresponding source texture rendered with scale.x = -baseScale.
 *
 * Lookup: getFrame('south', frameIdx) -> { tex, mirror }.  Returns
 * null until the source PNG resolves; entityRenderer falls back to
 * the procedural archetype circle while the load is in flight.
 */

import { Rectangle, Texture } from 'pixi.js';
import { loadTracked, unloadBundle } from './zoneTextures.js'; /* v2.3.2272: zone art must be releasable */

const FRAME_W = 128;
const FRAME_H = 128;

/* Bump on every sprite-art change.  Browsers (and Cloudflare Pages'
   edge cache) hold the previous PNG by URL, so swapping bytes alone
   isn't enough — the URL has to change.  Append as ?v=… so the file
   on disk keeps its pretty name. */
const SPRITE_VERSION = '2.1.14';   /* v2.3.2215: attack sheets added */

const SOURCE_DIRS = ['south', 'southwest', 'east', 'north', 'northeast'];

/* Map every 8-cardinal facing to a (sourceDir, mirror) pair. */
const DIR_MAP = {
  south:     { src: 'south',     mirror: false },
  southwest: { src: 'southwest', mirror: false },
  west:      { src: 'east',      mirror: true  },
  northwest: { src: 'northeast', mirror: true  },
  north:     { src: 'north',     mirror: false },
  northeast: { src: 'northeast', mirror: false },
  east:      { src: 'east',      mirror: false },
  southeast: { src: 'southwest', mirror: true  },
};

const SHEETS = {};   // sourceDir -> { frames: Texture[] }
/* v2.3.2215: the snowball-throw wind-up, one strip per source facing —
   the same 5 directions and the same DIR_MAP mirroring as the idle set,
   so a west-facing throw is the east strip flipped exactly as its idle
   is.  Kept in its own map rather than folded into SHEETS because a
   facing may have an idle strip and no attack strip (the renderer falls
   back to the idle pose rather than freezing on a missing frame). */
const ATTACK_SHEETS = {};   // sourceDir -> { frames: Texture[] }
/* Single-frame death-scene sprite — what's left on the ground after a
   snowman is killed.  Held as a bare Texture, not a sheet, because
   it never animates. */
let remnantsTex = null;
/* Non-directional hit-reaction sheet — same recoil regardless of
   facing.  Frame count auto-detected from texture width. */
let hitFrames = [];
/* Non-directional death sheet — body shatters, then debris scatters.
   Source mp4 is 5.77 s; sampled to 12 frames so the strip plays in
   ~500 ms at 42 ms/frame (caller-controlled via SNOWMAN_DEATH_MS in
   the renderer). */
let deathFrames = [];
let loadPromise = null;

function dirShort(dir) {
  return ({ south: 's', southwest: 'sw', east: 'e', north: 'n', northeast: 'ne' })[dir];
}

async function loadOne(dir) {
  try {
    const tex = await loadTracked('snowman', `/sprites/monsters/snowman/snowman-${dirShort(dir)}.png?v=${SPRITE_VERSION}`);
    if (!tex || !tex.source) return;
    const count = Math.max(1, Math.floor((tex.source.width || tex.width || 0) / FRAME_W));
    const frames = [];
    for (let i = 0; i < count; i++) {
      frames.push(new Texture({
        source: tex.source,
        frame: new Rectangle(i * FRAME_W, 0, FRAME_W, FRAME_H),
      }));
    }
    SHEETS[dir] = { frames };
  } catch {
    /* missing strip — caller falls back to procedural circle */
  }
}

/* v2.3.2215: attack strip for one facing.  Silent on failure like
   loadOne — a missing strip means the renderer keeps the idle pose, which
   is how this shipped before the art existed. */
async function loadAttack(dir) {
  try {
    const tex = await loadTracked('snowman', `/sprites/monsters/snowman/snowman-attack-${dirShort(dir)}.png?v=${SPRITE_VERSION}`);
    if (!tex || !tex.source) return;
    const count = Math.max(1, Math.floor((tex.source.width || tex.width || 0) / FRAME_W));
    const frames = [];
    for (let i = 0; i < count; i++) {
      frames.push(new Texture({
        source: tex.source,
        frame: new Rectangle(i * FRAME_W, 0, FRAME_W, FRAME_H),
      }));
    }
    ATTACK_SHEETS[dir] = { frames };
  } catch {
    /* missing strip — renderer holds the idle pose */
  }
}

/* v2.3.2217: the thrown snowball's art.  It is CUT FROM frame 5 of the
   south throw strip — the frame the wind-up skips, because that frame's
   whole content is the ball drawn in flight, standalone and free of the
   claw that wraps it in every held frame.  So the projectile is not a
   lookalike of the ball he throws; it is literally the same drawing.
   (Owner, 2026-09-01: the procedural orb "looks like a plain white
   circle" next to the detailed one in his hand.) */
let snowballTex = null;

async function loadSnowball() {
  try {
    const tex = await loadTracked('snowman', `/sprites/monsters/snowman/snowball.png?v=${SPRITE_VERSION}`);
    if (tex && tex.source) snowballTex = tex;
  } catch {
    /* missing — effectsRenderer falls back to its procedural orb */
  }
}

/** The thrown-snowball texture, or null until loaded.  Its art is 32px
 *  across in a 36px cell; draw it at the strips' own 0.5 scale so the ball
 *  in the air matches the size of the ball in his hand. */
export function getSnowballTexture() {
  return snowballTex;
}

/* ═══ v2.3.2221: THE SNOW-PILE BURROW ═══
   Three single-direction strips (the mound has no facing worth reading —
   it is a shape on the ground, and giving it five would be five sheets of
   the same silhouette).  Loaded with the rest of the snowman, so they ride
   the frost zone's preload and are ready before the overlay lifts. */
const PHASE_SHEETS = { burrow: [], pile: [], emerge: [] };

async function loadPhaseStrips() {
  await Promise.all(Object.keys(PHASE_SHEETS).map((k) =>
    loadStrip(`/sprites/monsters/snowman/snowman-${k}.png?v=${SPRITE_VERSION}`, PHASE_SHEETS[k])));
}

/* One frame of a burrow phase.  CLAMPED, not wrapped: dig and emerge are
   one-shots that hold their final pose until the server moves the phase on,
   and a loop would read as a stutter.  The PILE is the exception — it is a
   travelling loop, so its caller passes wrap. */
export function getPhaseFrame(phase, frameIdx, wrap) {
  const list = PHASE_SHEETS[phase];
  if (!list || list.length === 0) return null;
  const n = list.length;
  const i = wrap ? ((frameIdx % n) + n) % n : Math.max(0, Math.min(n - 1, frameIdx));
  return list[i];
}

export function phaseFrameCount(phase) {
  const list = PHASE_SHEETS[phase];
  return (list && list.length) || 0;
}

async function loadRemnants() {
  try {
    const tex = await loadTracked('snowman', `/sprites/monsters/snowman-remnants.png?v=${SPRITE_VERSION}`);
    if (tex && tex.source) remnantsTex = tex;
  } catch {
    /* missing — caller falls back to procedural coin pile */
  }
}

async function loadStrip(url, into) {
  try {
    const tex = await loadTracked('snowman', url);
    if (!tex || !tex.source) return;
    const count = Math.max(1, Math.floor((tex.source.width || tex.width || 0) / FRAME_W));
    const list = [];
    for (let i = 0; i < count; i++) {
      list.push(new Texture({
        source: tex.source,
        frame: new Rectangle(i * FRAME_W, 0, FRAME_W, FRAME_H),
      }));
    }
    into.push(...list);
  } catch {
    /* missing — caller skips and falls back to idle */
  }
}

async function loadHit() {
  await loadStrip(`/sprites/monsters/snowman-hit.png?v=${SPRITE_VERSION}`, hitFrames);
}

async function loadDeath() {
  await loadStrip(`/sprites/monsters/snowman-death.png?v=${SPRITE_VERSION}`, deathFrames);
}

export function loadSnowmanSprites() {
  if (loadPromise) return loadPromise;
  loadPromise = Promise.all([
    ...SOURCE_DIRS.map(loadOne),
    ...SOURCE_DIRS.map(loadAttack),   /* v2.3.2215 */
    loadRemnants(), loadHit(), loadDeath(),
    loadSnowball(),   /* v2.3.2217 */
    loadPhaseStrips(),   /* v2.3.2221 */
  ]);
  return loadPromise;
}

/** Single-frame death-scene texture, or null until loaded. */
export function getRemnantsTexture() {
  return remnantsTex;
}

/** Hit-reaction frame at the given index (wraps modulo length).  Null
 *  until the hit sheet has loaded. */
export function getHitFrame(frameIdx) {
  if (hitFrames.length === 0) return null;
  const len = hitFrames.length;
  const idx = ((frameIdx % len) + len) % len;
  return hitFrames[idx];
}

export function hitFrameCount() {
  return hitFrames.length;
}

/** Death-anim frame at the given index (clamped to last frame; death
 *  is a one-shot, not a loop).  Null until the sheet has loaded. */
export function getDeathFrame(frameIdx) {
  if (deathFrames.length === 0) return null;
  const idx = Math.max(0, Math.min(deathFrames.length - 1, frameIdx));
  return deathFrames[idx];
}

export function deathFrameCount() {
  return deathFrames.length;
}

/* Resolve a facing + frame index to the texture + mirror flag.  Frame
   index wraps modulo the strip's frame count, so callers can pass an
   ever-incrementing counter without bounds checking. */
export function getFrame(facing, frameIdx) {
  const m = DIR_MAP[facing] || DIR_MAP.south;
  const sheet = SHEETS[m.src];
  if (!sheet || sheet.frames.length === 0) return null;
  const len = sheet.frames.length;
  const idx = ((frameIdx % len) + len) % len;
  return { tex: sheet.frames[idx], mirror: m.mirror };
}

export function frameCount(facing) {
  const m = DIR_MAP[facing] || DIR_MAP.south;
  const sheet = SHEETS[m.src];
  return (sheet && sheet.frames.length) || 0;
}

/* v2.3.2215: attack-strip lookup.  Same facing→(source, mirror) resolution
   as getFrame, but the index is CLAMPED rather than wrapped: the throw is a
   one-shot that should hold its final pose until the wind-up ends, not loop
   back to the neutral frame mid-swing. */
export function getAttackFrame(facing, frameIdx) {
  const m = DIR_MAP[facing] || DIR_MAP.south;
  const sheet = ATTACK_SHEETS[m.src];
  if (!sheet || sheet.frames.length === 0) return null;
  const idx = Math.max(0, Math.min(sheet.frames.length - 1, frameIdx));
  return { tex: sheet.frames[idx], mirror: m.mirror };
}

/* ═══ v2.3.2216: WHERE THE BALL LEAVES THE HAND ═══
   The attack strips are not uniform anticipation: on the 8-frame sheets,
   frames 0-4 wind up (ball picked up, raised overhead, body coiled),
   frame 5 is the RELEASE (the ball is drawn detached and airborne), and
   6-7 are follow-through with empty hands.

   v2.3.2215 spread all 8 frames evenly across the server's wind-up, which
   put the drawn release at 62.5% of a 350ms tell — the snowman threw at
   ~219ms, his drawn ball then vanished for frames 6-7, and the REAL
   server projectile did not exist until 350ms.  That ~130ms hole is the
   "awkward disconnect" the owner reported on 2026-09-01.

   So the strip is split here instead of scaled: the anticipation frames
   fill the wind-up exactly, and the release frame lands on the same
   instant the server creates the projectile.  Latency does not reopen the
   gap — the wind-up event and the projectile both cross the wire, so both
   client-side timestamps shift by the same half-RTT.

   Any FUTURE monster attack strip must declare its own release index the
   same way; a sheet whose ball leaves mid-strip and is timed uniformly
   will reproduce this bug exactly. */
export const ATTACK_RELEASE_FRAME = 5;

/* Clamped so a shorter/redrawn strip cannot index past its own end (which
   would silently pin the whole wind-up on the last frame). */
export function attackReleaseFrame(facing) {
  const fc = attackFrameCount(facing);
  if (fc <= 0) return 0;
  return Math.min(ATTACK_RELEASE_FRAME, fc - 1);
}

/* ═══ v2.3.2217: WHERE THE BALL ACTUALLY LEAVES HIS HAND ═══
   The server creates the snowball at the monster's logical point, which is
   the snowman's FEET — his sprite is anchored bottom-centre at y = +13 and
   stands 64px tall, so the logical point sits near the bottom of the art.
   His hand is 17-45px ABOVE that, and off to one side. v2.3.2216 fixed
   *when* the ball appears but not *where*, so it still popped into
   existence at his base rather than out of his claw (owner, 2026-09-01:
   "the position of the snowball from the thrown position do not match up").

   These are the ball's centre in SOURCE pixels on frame 4 of each strip —
   the last frame it is still held — measured off the sheets rather than
   guessed, and re-measurable the same way if the art is redrawn: render
   frame 4 at 3-5x with a 16px grid and read the ball's centre.

   Stored as source pixels, not world offsets, so the anchor/scale maths
   below stays the single place that knows how the sprite is placed.

   Note how much they differ — he holds it overhead facing south, east and
   north, but low and to the side facing southwest. One flat offset would
   be visibly wrong for at least one facing, which is why this is a table. */
const THROW_MUZZLE_PX = {
  south:     { x: 32,  y: 22 },
  southwest: { x: 22,  y: 68 },
  east:      { x: 64,  y: 21 },
  northeast: { x: 116, y: 17 },
  north:     { x: 36,  y: 12 },
};
const FRAME_PX = 128;      /* source cell */
const RENDER_PX = 64;      /* drawn size — entityRenderer's baseScale 64/128 */
const FOOT_Y = 13;         /* spriteBody.y = getMonsterSize('snowman') */

/* Offset from the monster's logical point to his throwing hand, in world
   px, for the facing currently being drawn. Mirrored facings negate x, the
   same way the strip itself is flipped. */
export function throwMuzzle(facing) {
  const m = DIR_MAP[facing] || DIR_MAP.south;
  const p = THROW_MUZZLE_PX[m.src] || THROW_MUZZLE_PX.south;
  const sc = RENDER_PX / FRAME_PX;
  return {
    dx: (p.x - FRAME_PX / 2) * sc * (m.mirror ? -1 : 1),
    dy: p.y * sc - (FRAME_PX * sc - FOOT_Y),
  };
}

export function attackFrameCount(facing) {
  const m = DIR_MAP[facing] || DIR_MAP.south;
  const sheet = ATTACK_SHEETS[m.src];
  return (sheet && sheet.frames.length) || 0;
}

export function hasFrames() {
  return Object.keys(SHEETS).length > 0;
}

/* ═══ v2.3.2272: AND BACK AGAIN ═══
 * Frost is the only snowman zone -- that is why v2.3.1405 moved these ~17.5MB
 * (decoded) off the global preload gate in the first place.  It moved them to
 * per-zone LOADING and stopped there; this is the exit half.  See
 * zoneTextures.js for the measurement that made it necessary. */
export function unloadSnowmanSprites() {
  loadPromise = null;
  for (const k in SHEETS) delete SHEETS[k];
  for (const k in ATTACK_SHEETS) delete ATTACK_SHEETS[k];
  remnantsTex = null;
  hitFrames = [];
  deathFrames = [];
  snowballTex = null;
  return unloadBundle('snowman');
}
