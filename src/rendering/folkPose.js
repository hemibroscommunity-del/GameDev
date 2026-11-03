/* ═══ v2.3.4058: A TOWNSPERSON AT WORK, IN THE PLAYER'S OWN POSES ═══
 *
 * The owner: "Make NPCs walk around and do stuff now since it doesn't make
 * much memory anymore."  When his day has him at a stop with a job
 * (game/townsfolkWalk.js FOLK_DAYS `work`), entityRenderer _drawFolk draws
 * him in one of the player's work poses instead of the stand: the mining
 * swing (a hammer, a cleaver, an axe, a hoe, a gavel), the pickup (coins, a
 * gem, a parcel) or the cast (fishing).  Each is a body sheet every phone
 * already holds as colour numbers (lookSets/body.js: mine-south, pickup-south,
 * fish-south, loaded with the stand and the jog behind the loading screen) and
 * the tee's own sheet for it (gearSheets preloadGear warms every pose), so a
 * townsperson at work loads nothing and bakes nothing:
 *   - only while the look palette has that pose in numbers (lookPose): with
 *     it missing, getLookBodyFrame would fall to the old path, which bakes a
 *     copy of the sheet for his look -- new memory -- so he stands instead;
 *   - his tee is drawn in its colour WITHOUT its print while he works (the
 *     palette's tee has numbers only for the stand and the jog: a patterned
 *     tee in another pose is a bake of its own, gearSheets getShirtLookFrame,
 *     a few MB a look).
 * The poses are authored facing south, so he faces you while he works.
 * Each townsperson works on his own beat (the caller's per-id phase). */
import { lookPose } from './lookPalette.js';
import { frameCount as playerFrameCount, cycleMs } from './playerSprites.js';

const WORK = new Set(['mine', 'fish', 'pickup']);
/* a loop's length for him, ms: the pickup is the player's half-second grab,
   which at work reads as bobbing -- slowed to a steady stack-and-lift */
const WORK_MS = { pickup: 1600 };
const WORK_FRAMES = { mine: 14, fish: 32, pickup: 29 };

/* `?folkwork=0`: they walk, but stand at their stops (one phone) */
const _workOff = (() => { try { return /(^|[?&])folkwork=0(&|$)/.test(window.location.search || ''); } catch (e) { return false; } })();

/** The work pose he is at and can be drawn in, or null (stand or walk). */
export function folkWorkPose(npc) {
  const w = npc && npc._folkWork;
  return (w && !_workOff && WORK.has(w) && lookPose(w)) ? w : null;
}

/** That pose's frame at time `t` (ms, his own beat added). */
export function folkWorkFrame(pose, t) {
  const fc = playerFrameCount(pose, 'south') || WORK_FRAMES[pose] || 1;
  const cyc = WORK_MS[pose] || cycleMs(pose, 'south') || 1000;
  return Math.floor((((t / cyc) % 1) + 1) % 1 * fc) % fc;
}

/** The way he faces standing: his day's (`_folkFace`, toward you when he
 *  stops for you), else the way he last walked, else south. */
export function folkStandFacing(npc, walkDir) {
  return (npc && npc._folkFace) || walkDir || 'south';
}
