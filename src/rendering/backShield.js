/* ═══ WHERE THE SLUNG SHIELD SITS (v2.3.1784) ═══
 *
 * Owner: "make sure the shield layering works when using all attack animations
 * and armor combos."
 *
 * It did not, and the reason is structural rather than a wrong number.  During
 * a sword swing or a bow shot the player's real body is HIDDEN
 * (entityRenderer._updatePlayer) and the whole figure is redrawn by a stand-in
 * in a different layer (effectsRenderer, nodeLayer) — but `pose` stays 'stand'
 * or 'jog' throughout, so the v2.3.1782 back shield kept drawing in the player
 * container against a body that was no longer there.  Measured: mid-swing the
 * probe still read on:true, front:true, with the body sprite hidden.  A shield
 * hanging in the air beside a swing is the bug the owner is describing.
 *
 * Fixing it means the shield has to be drawn TWICE — once in the walking
 * render, once in each attack stand-in — and the moment a value is copied into
 * two renderers it starts to drift.  So the geometry lives HERE, once, and
 * both callers ask for it.  There is no second copy to forget.
 *
 * The two-sprite z-order trick that v2.3.1782 introduced is unchanged and now
 * applies to the stand-ins too: each renderer owns a LOW clone below its body
 * and a HIGH clone above it, and picking a facing only toggles `visible`.  No
 * renderer computes a child index for the shield at any point, which is the
 * property that keeps the armour combos working — a plate, greaves and a
 * helmet all sit between the two clones by construction, whatever order the
 * gear layers are added in.
 */
import { getShieldFrame } from './shieldSprites.js';

/** Rendered size in WORLD px.  v2.3.1784 (owner: "Double the size of the
 *  shield though") — 36 -> 72.  Set as an explicit world size rather than a
 *  scale factor so the two renderers cannot disagree just because one of them
 *  hands the sprite a different-sized source texture. */
export const BACK_SHIELD_PX = 72;

/** The RAISED shield, in the same world px as the slung one.
 *  v2.3.1798 (owner: "the shield looks much smaller while it's active and
 *  straight out.  The shield on the characters bag looks much larger.  I
 *  prefer the larger look").  They were two different sizes for no reason
 *  anyone chose: the held shield was `scale = 56/64`, a scale factor written
 *  when the source art happened to be 64px, while the slung one has been an
 *  explicit 72 world px since v2.3.1784.  One shield, one size — and stated
 *  the same way in both places, so a future change to the source art cannot
 *  silently move one and not the other. */
export const HELD_SHIELD_PX = BACK_SHIELD_PX;

/* Displacement from the body's centre.  X and Y get DIFFERENT radii: on this
   near-top-down view horizontal displacement is what carries the shield past
   the body's silhouette at E/W, while vertical displacement reads as HEIGHT,
   so the same 11px up-screen at S would lift it onto the back of the head.
   These place the shield's CENTRE, which does not move when the shield grows —
   so they are deliberately NOT scaled with BACK_SHIELD_PX. */
const BACK_RX = 11, BACK_RY = 5, BACK_LIFT = 14;

/* The body art leans forward at a jog; a bolt-upright shield reads as
   detached.  Strongest at E/W, zero at N/S where the lean is in and out of the
   screen plane.  NOT mirror-corrected — pixi builds its transform as T*R*S, so
   `rotation` acts in the parent frame and a negative scale.x cannot flip it;
   correcting it makes E and W lean the same way, i.e. one of them leans
   backwards out of its own run. */
const RUN_LEAN = 0.15;

/* Drawn in FRONT of the body only when the camera is looking at the player's
   back.  facingIdx: 0=E 1=SE 2=S 3=SW 4=W 5=NW 6=N 7=NE. */
const FRONT_FACINGS = new Set([5, 6, 7]);

/**
 * Where the slung shield goes for one facing, or null if the shield art has
 * not loaded yet (callers hide both clones on null).
 *
 * @param {number} facingIdx 0..7, the SECTORS order shared with entityRenderer
 * @param {boolean} jogging   apply the running lean
 * @param {number} bobY       the body's current bob, so the shield rises with it
 */
export function backShieldPlacement(facingIdx, jogging, bobY) {
  if (!(facingIdx >= 0)) return null;
  /* The outward face of a shield on the back points OPPOSITE the way the
     player faces, so the view is chosen from facing + PI. */
  const frame = getShieldFrame(facingIdx * Math.PI / 4 + Math.PI);
  if (!frame) return null;
  const ang = facingIdx * Math.PI / 4;
  return {
    frame,
    behind: !FRONT_FACINGS.has(facingIdx),
    dx: -Math.cos(ang) * BACK_RX,
    dy: -Math.sin(ang) * BACK_RY - BACK_LIFT + (bobY || 0),
    rot: jogging ? RUN_LEAN * Math.cos(ang) : 0,
  };
}

/**
 * Point one sprite at a placement.  Sizing goes through width/height rather
 * than scale so the result is BACK_SHIELD_PX world px whatever the source
 * texture measures; the mirror is then re-applied as the sign of scale.x.
 */
export function applyBackShield(sprite, place, sizePx) {
  if (!sprite || !place) return;
  if (sprite.texture !== place.frame.tex) sprite.texture = place.frame.tex;
  const px = sizePx || BACK_SHIELD_PX;
  sprite.width = px;
  sprite.height = px;
  sprite.scale.x = Math.abs(sprite.scale.x) * (place.frame.mirror ? -1 : 1);
  sprite.rotation = place.rot;
  sprite.tint = 0xffffff;
  sprite.alpha = 0.95;
  sprite.visible = true;
}
