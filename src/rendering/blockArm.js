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
 *      two sets touch.
 *   2. NO SLEEVE.  The arm is bare skin, so a chest plate or a shirt stopped at
 *      the shoulder.
 *
 * BOTH LANDED, so the flag is on.
 *   (1) v2.3.1788 fixed it one layer up and for more than this arm: the attack
 *       stand-ins now always apply a skin target instead of leaving 'default'
 *       as identity, so the sword and bow sheets bake onto the walking palette
 *       (bow-east went [223,121,57] -> [199,130,73] against a walking
 *       reference of [188,121,70]).  The bro no longer changes complexion when
 *       he swings either — see mp-standinskin.
 *   (2) v2.3.1789 cuts the SAME rect out of the worn chest piece's `bowshot`
 *       strip and draws it over the arm, tinted by the piece's material.
 *
 * The flag stays as a named constant rather than being deleted: south still has
 * no arm in this art (see BLOCK_ARM_FACING), so this feature is knowingly
 * partial, and one edit turns it off if it reads badly in play. */
export const BLOCK_ARM_ENABLED = true;

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

/* ═══ v2.3.1833: WHERE THE SHIELD SITS ON THE FACINGS THAT HAVE NO CUT ═══
 *
 * Owner: "The northeast shield position (and mirror) is not positioned
 * correctly on the outstretched hand."
 *
 * They are right, and the cause is that NW/N/NE never had a hand position at
 * all.  ARM_CUTS above covers only the facings where the shield is drawn IN
 * FRONT of the body, because that is where a cut ARM was needed — and the
 * shield happened to be positioned by the same table.  On the three facings
 * where the player's back is to the camera there is no cut, so `_armHand` is
 * null and the shield fell through to a polar fallback: 16px from the body
 * CENTRE along the guard angle.  That put it flat against the torso, mostly
 * hidden behind the body, while the stand-in's authored arm reached out to
 * nothing.
 *
 * The stand-in body DOES have an outstretched arm on all three — it is a
 * bow-shot pose — so the hand is there to sit on; nobody had measured it.
 * These are those points, in the bow frame's own coordinates, same space and
 * same meaning as `hand` above: the point the shield's CENTRE sits on.  Read
 * off the art (the frame the block holds, BLOCK_POSE_FRAME) rather than
 * derived, because the two shipped values disagree about the rule — east's
 * sits at the centre of the closed fist, southwest's out at the fingertips.
 *
 * northeast is absent DELIBERATELY: _bowFacing maps it to ['northwest', true],
 * so it renders the northwest sheet mirrored and takes this point mirrored
 * with it.  A separate northeast entry would be a second source of truth for
 * one piece of art.  south is absent too — v2.3.1805 keeps a south block on
 * the real body, not the stand-in.
 */
export const BLOCK_STANDIN_HAND = {
  northwest: [19, 104],
  north:     [100, 100],
};

/* Baked bow body frames, handed over by effectsRenderer after every recolour
   bake (so the arm follows a skin change without its own loader).  Keyed by
   authored sheet name. */
const _sheets = Object.create(null);
const _cache = new Map();
const _sleeveCache = new Map();   /* `${sheet}|${item}` -> sliced sleeve */

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

/** The SLEEVE for the same cut: the identical rectangle taken from the worn
 *  chest piece's `bowshot` strip, which is authored to overlay the bow body
 *  frame-for-frame — so the same rect lands on the same arm with no second
 *  set of numbers to keep in step.
 *
 *  This closes the gap v2.3.1785 shipped disabled with: the arm is cut from
 *  the BALD body sheet, so without this a bro in a copper plate reached out
 *  with a bare arm.  Returns null when nothing is worn (bare arm is then
 *  correct) or while the strip is still building.
 *
 *  getGearFrame resolves a recoloured set to its donor art internally, so
 *  `copperplate` shares steel's texture and the caller tints — same contract
 *  the walking gear and every stand-in already use.
 */
export function blockArmSleeveTexture(sheet, item, gearFrameFor) {
  const cut = BLOCK_ARM_CUT[sheet];
  if (!cut || !item || item === 'none' || !gearFrameFor) return null;
  const base = gearFrameFor('chest', item, 'bowshot', sheet, cut.frame);
  if (!base) return null;
  const key = sheet + '|' + item;
  const hit = _sleeveCache.get(key);
  if (hit && hit.src === base.source && hit.fx === base.frame.x) return hit.tex;
  const f = base.frame;
  /* The gear strip is sliced to the same per-facing frame box as the body, so
     the body cut's rect applies unchanged.  Clamp to the frame anyway: a
     re-cut sheet with a different box would otherwise throw on a frame that
     runs past its source. */
  const x = f.x + cut.rect[0], y = f.y + cut.rect[1];
  const w = Math.min(cut.rect[2], Math.max(0, f.x + f.width - x));
  const h = Math.min(cut.rect[3], Math.max(0, f.y + f.height - y));
  if (w <= 0 || h <= 0) return null;
  const tex = new Texture({ source: base.source, frame: new Rectangle(x, y, w, h) });
  _sleeveCache.set(key, { src: base.source, fx: f.x, tex });
  return tex;
}

/** Has the art arrived for this facing yet? */
export function blockArmReady(facing) {
  const m = BLOCK_ARM_FACING[facing];
  return !!(m && blockArmTexture(m[0]));
}
