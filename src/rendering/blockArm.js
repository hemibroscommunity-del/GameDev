/* ═══ THE ARM THAT HOLDS THE RAISED SHIELD (v2.3.1785) ═══
 *
 * Owner: "I might be able to re use some bow shooting animation frames to make
 * it look like the arm held outward is holding the shield.  Right now it's just
 * floating" — and, after I tried the wrong thing first: "There is no
 * outstretched arm the shield orbits the body.  Thats why you need the bow
 * frames for the outstretched arm."
 *
 * That correction is the whole design note.  My first attempt reused v2.3.200's
 * arm capsule, which clones the BODY texture and masks it to a stroke from the
 * shoulder to the weapon.  That works during an east jog because the jog frame
 * genuinely draws an extended arm — the mask only ever REVEALS pixels that are
 * already there.  In stand and jog-toward-camera frames the arms are down at
 * the sides, so the capsule revealed torso and background and the shield went
 * on orbiting an unconnected body.  There is no substitute for art of an arm.
 *
 * The bow-shot sheets have exactly that art, and two properties make them
 * reusable rather than merely similar:
 *   - the BOW IS A SEPARATE LAYER (bow-<dir>-weapon.png), so the outstretched
 *     hand in bow-<dir>-body.png is already empty and open;
 *   - those sheets are already loaded and already recoloured to the player's
 *     chosen skin by effectsRenderer's bake, so an arm cut from them matches
 *     the body it is composited onto, for free and for every skin.
 *
 * So this cuts the arm out of the bow frame at runtime — a Texture sub-frame,
 * no new files, nothing extra to load, and nothing to regenerate when the art
 * changes.
 *
 * ONLY THREE CUTS, and that is not a gap.  The arm is drawn only where the
 * shield is drawn IN FRONT of the body — E/SE/S/SW/W — because on NW/N/NE the
 * player's back is to the camera and the shield is held away from it.  Those
 * five facings come from three authored sheets: east (mirrored for west),
 * southwest (mirrored for southeast) and south.  The same facing set the
 * in-hand z-order rule uses, so the arm and the shield can never disagree
 * about which side of the body they are on.
 */
import { Rectangle, Texture } from 'pixi.js';

/* ═══ OFF BY DEFAULT, DELIBERATELY (v2.3.1785) ═══
 * The cut works — the arm comes off the shoulder, runs out, and the shield
 * sits in the hand — but it is not finishable without two things that are not
 * in this commit, and both would be VISIBLE on the preview build the owner is
 * reviewing:
 *
 *   1. THE TWO ART SETS HAVE DIFFERENT SKIN.  bow-east-body.png is authored
 *      orange; stand-east.png is authored brown.  On the default skin the
 *      recolour is identity for each, so they simply stay different — an
 *      orange arm on a brown body.  It has never shown before because the bow
 *      stand-in replaces the WHOLE body, so nothing sits next to it to compare
 *      against; compositing an arm onto the walking body is the first time the
 *      two sets touch.  The fix is to bake the arm through the recolour with
 *      the bow sheet's orange as the SOURCE palette rather than identity.
 *   2. NO SLEEVE.  The arm is bare skin, so a chest plate or a shirt stops at
 *      the shoulder.  The same cut taken from the `bowshot` gear strips fixes
 *      it, and those strips already exist.
 *
 * Shipping it enabled would put a mismatched bare arm on the preview mid-review,
 * which is worse than the floating shield it replaces.  With this false,
 * blockArmTexture returns null and every caller falls back to exactly the
 * v2.3.1784 behaviour — this file is then dead weight and nothing else changes.
 * Flip to true once (1) and (2) land. */
export const BLOCK_ARM_ENABLED = false;

/** Rendered facing -> [authored sheet, mirror].  Deliberately has no entry for
 *  northwest / north / northeast: no arm is drawn there. */
export const BLOCK_ARM_FACING = {
  east:      ['east', false],
  west:      ['east', true],
  southeast: ['southwest', true],
  southwest: ['southwest', false],
  /* NO SOUTH ENTRY, and this is a finding rather than an omission.  The bow
     art's south frames are foreshortened by design — the bow points at the
     camera, so both hands sit on the chest and there is no outstretched arm
     anywhere in the sheet to cut.  (The south frames also carry the bowstring
     and some colour bleed from the arrow layer right where a cut would land.)
     Facing straight at the camera therefore keeps the old free-floating
     shield.  Fixing it needs a painted south block frame; nothing in the
     existing art can stand in for one. */
};

/* The cut, per authored sheet, in the bow frame's own pixels.
 *   frame     which of the three bow frames to take the arm from (they differ:
 *             the later ones pull the draw hand across the chest)
 *   rect      [x, y, w, h] of the arm inside that frame
 *   shoulder  the point INSIDE rect that lands on the body's shoulder
 *   hand      the point INSIDE rect the shield centre sits on
 * Tuned against screenshots; see tools/qa/mp/mp-blockarm.mjs for the numbers
 * these produce on screen. */
export const BLOCK_ARM_CUT = {
  /* Frame 2 in both, because that is where the DRAW arm is furthest out of the
     way: in frames 0 and 1 it crosses the chest at the same height as the arm
     being cut, and any rect wide enough to hold the outstretched hand also
     catches the other fist — which is exactly what the first attempt drew, two
     hands on one arm. */
  east:      { frame: 2, rect: [128, 92, 78, 32], shoulder: [2, 12],  hand: [60, 14] },
  southwest: { frame: 2, rect: [6, 86, 58, 34],   shoulder: [56, 12], hand: [10, 18] },
};

/* Baked bow body frames, handed over by effectsRenderer after every recolour
   bake (so the arm follows a skin change without its own loader).  Keyed by
   authored sheet name. */
const _sheets = Object.create(null);
const _cache = new Map();

/** effectsRenderer calls this whenever it (re)bakes a bow body strip. */
export function registerBowBodyFrames(dir, frames) {
  _sheets[dir] = frames;
  _cache.delete(dir);          // a rebake means a new source; re-slice on demand
}

/** The arm texture for an authored sheet, sliced from the baked bow frame.
 *  Null until the bow art has loaded — callers draw no arm rather than a
 *  placeholder, and the shield falls back to its old free-floating position. */
export function blockArmTexture(sheet) {
  if (!BLOCK_ARM_ENABLED) return null;
  const cut = BLOCK_ARM_CUT[sheet];
  const frames = _sheets[sheet];
  if (!cut || !frames || !frames[cut.frame]) return null;
  const base = frames[cut.frame];
  const hit = _cache.get(sheet);
  if (hit && hit.src === base.source) return hit.tex;
  const f = base.frame;
  const tex = new Texture({
    source: base.source,
    frame: new Rectangle(f.x + cut.rect[0], f.y + cut.rect[1], cut.rect[2], cut.rect[3]),
  });
  _cache.set(sheet, { src: base.source, tex });
  return tex;
}

/** Has the art arrived for this facing yet? */
export function blockArmReady(facing) {
  const m = BLOCK_ARM_FACING[facing];
  return !!(m && blockArmTexture(m[0]));
}
