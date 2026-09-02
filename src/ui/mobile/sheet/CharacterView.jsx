import React from 'react';
import { drawCharacterPortrait } from '@/rendering/characterPortrait.js';
import { getSkin, getPants, getShoes, onSkinChange, onPantsChange, onShoesChange } from '@/rendering/playerSkins.js';
import { getHair, onHairChange } from '@/rendering/traits/hairCatalog.js';
import { getHairColor, onHairColorChange, hairColorTarget } from '@/rendering/traits/hairColorCatalog.js';
import { getFacialHair, onFacialHairChange } from '@/rendering/traits/facialHairCatalog.js';
import { getFacialHairColor, onFacialHairColorChange, facialHairColorTarget } from '@/rendering/traits/facialHairColorCatalog.js';
import { getHeadwear, onHeadwearChange } from '@/rendering/traits/headwearCatalog.js';
import { getHatColor, onHatColorChange, hatColorTarget } from '@/rendering/traits/hatColorCatalog.js';
import { getShirtColor, onShirtColorChange, shirtColorTarget } from '@/rendering/traits/shirtColorCatalog.js';
import { getEyeColor, onEyeColorChange } from '@/rendering/traits/eyeColorCatalog.js'; /* v2.3.1928 */
import { getEquip, onEquipChange } from '@/rendering/gearCatalog.js';

/* ═══ v2.3.1815: YOUR CHARACTER, ON THE EQUIP SCREEN ═══
 *
 * Owner: "On the character equip menu find space to put as large view of the
 * character as possible to fit inside the space.  Should show armor worn etc
 * if player is wearing it." — and, on which pose: "Southwest idle view".
 *
 * WHY SOUTHWEST IS THE RIGHT ONE TO ASK FOR, and why it costs nothing extra:
 * it is the three-quarter facing, so it shows the front of the torso AND the
 * side of the pauldron — the two places armour actually reads — where south
 * flattens the shoulder and east hides the chest. drawCharacterPortrait
 * already carries a per-direction zoom table with southwest in it, so the
 * figure is sized for this angle rather than cropped into it.
 *
 * NOT A SECOND RENDERER.  This draws through drawCharacterPortrait, the same
 * compositor the character creator uses, extended in this version to carry
 * worn armour. Building a separate one would have meant re-deriving the
 * layer order, the recolour pipeline and the trait anchors — three things
 * that are already correct in one place and would drift apart in two.
 *
 * IDLE, NOT ANIMATED, and that is a deliberate limit rather than an
 * oversight: frame 0 of the stand strip is the rest pose. An idle CYCLE here
 * would mean a rAF loop repainting a canvas that sits above the WebGL world
 * canvas — the exact per-frame overlay work v2.3.1808 removed from
 * QuestCoach after the owner reported a slowdown. A still figure costs one
 * draw when something changes and nothing at all while you read the screen.
 */

/* The portrait composites at 256 and the figure occupies most of it, so the
   canvas is square and the caller gives it whatever box it can spare. */
/* ═══ v2.3.1842: THE COMPACT CROP ═══
 * Owner: "keep the character size but make it a super compact rectangle
 * around the character to make way more room."
 *
 * The compositor works in a 256 SQUARE because that is the frame the sprite
 * sheets are cut in — but a standing person is narrow, so most of that width
 * is empty and the well around it was reserving all of it.  MEASURED with the
 * kit on (mp-heroview logs the painted bbox): the figure spans 43.8% of the
 * canvas width and its centre sits at 48.3%, a little left of the frame's
 * middle because the sword hangs on that side.
 *
 * So the canvas keeps its size — the character does not shrink, which is the
 * part the owner wants kept — and the WELL is narrowed to a window over it,
 * with the canvas slid so the figure lands in that window.  52% leaves a
 * margin either side of the measured 43.8% so a wider pose or a bigger shield
 * does not clip; mp-heroview asserts the figure still fits.
 */
export const FIGURE_W_FRAC = 0.52;   /* window width, as a fraction of `size` */
const FIGURE_CX_FRAC = 0.483;        /* measured centre of the painted figure */

/* v2.3.2225: `dir` is a PROP now, defaulting to the southwest this view has
   always drawn.  The Equipment screen's three-quarter facing was an owner
   pick (see the header) and is untouched; StatDemo needs the opposite one,
   because its scene puts a slime on the RIGHT and a hero facing away from
   the thing about to hit him reads as a bug -- which is exactly how the
   owner reported it. */
export const CharacterView = ({ size, weapon, shield, crop, dir }) => {
  const ref = React.useRef(null);
  /* Bumped by every catalog subscription below; the draw effect keys on it.
     A counter rather than the values themselves because there are twelve
     sources and comparing them all would be more code than redrawing. */
  const [rev, bump] = React.useReducer((n) => n + 1, 0);

  React.useEffect(() => {
    /* Every wardrobe store this figure reads from.  Missing a subscription
       does not break the picture — it makes it STALE, which is worse,
       because the screen you change your gear on would keep showing the old
       gear and look like the change did not take. */
    const offs = [
      onSkinChange, onPantsChange, onShoesChange,
      onHairChange, onHairColorChange,
      onFacialHairChange, onFacialHairColorChange,
      onHeadwearChange, onHatColorChange,
      onShirtColorChange, onEyeColorChange,   /* v2.3.1928 */
    ].map((sub) => { try { return sub(bump); } catch (e) { return null; } });
    for (const slot of ['chest', 'legs', 'shoulders', 'shirt']) {
      try { offs.push(onEquipChange(slot, bump)); } catch (e) { /* slot may not exist */ }
    }
    return () => offs.forEach((f) => { try { f && f(); } catch (e) { /* ignore */ } });
  }, []);

  React.useEffect(() => {
    let alive = true;
    const cv = ref.current;
    if (!cv) return undefined;
    const hair = getHair();
    const weaponNow = weapon || null;
    const shieldNow = !!shield;
    drawCharacterPortrait(cv, {
      dir: dir || 'southwest',
      skin: getSkin(), pants: getPants(), shoes: getShoes(),
      hair,
      /* 'long' opts out of hair recolour in the creator's own wiring
         (characterCreatorEffects) — matched here so the two views cannot
         disagree about the same head. */
      hairColor: hair === 'long' ? null : hairColorTarget(getHairColor()),
      facialHair: getFacialHair(), facialHairColor: facialHairColorTarget(getFacialHairColor()),
      headwear: getHeadwear(), hatColor: hatColorTarget(getHatColor(), getHeadwear()), /* v2.3.1927 */
        eyeColor: getEyeColor(),
      /* The shirt is a GEAR SLOT, not a trait — getShirt() is a different
         wardrobe with the same word on it, and reading the trait one here
         drew a bare-chested figure while the world sprite wore a tee.
         Caught by looking: __btWardrobe reported gearShirt 'tshirt' while
         this canvas rendered bare skin.  The COLOUR is still the trait
         (getShirtColor), which is what the world tints the gear sheet with
         and what join sends as `stc`. */
      shirt: getEquip('shirt'), shirtColor: shirtColorTarget(getShirtColor()),
      gear: { chest: getEquip('chest'), legs: getEquip('legs'), shoulders: getEquip('shoulders') },
      /* v2.3.1841 (owner: "It should also reflect the currently equipped items
         (like sword and shield) but right now it doesn't").  These come from
         the RPG state rather than the wardrobe catalogs — a weapon is not a
         cosmetic, and getEquip has no slot for it.  Passed as the live objects
         so the portrait can resolve the per-facing art and the grip. */
      weapon: weaponNow, shield: shieldNow,
      /* No groundShadow: the creator floats its figure on painted art where a
         contact shadow grounds it. Here it sits in a slate well, and a shadow
         with no floor under it reads as a smudge. */
      scale: Math.round((typeof window !== 'undefined' && window.devicePixelRatio) || 1),
    }).catch(() => { /* a missing sheet degrades to a bare figure, never a throw */ });
    return () => { alive = false; };
    /* Keyed on the weapon's identity and whether a shield is worn, not on the
       object: the RPG state is replaced wholesale on every server delta, so
       keying on the reference alone would repaint the canvas several times a
       second. */
  }, [rev, size, dir, weapon && (weapon.id || weapon.type), weapon && weapon.gearBase, !!shield]);   /* v2.3.2225: dir joins the deps -- a facing the effect never re-reads is a facing that silently sticks */

  const winW = crop ? Math.round(size * FIGURE_W_FRAC) : size;
  /* Slide the canvas so the figure's measured centre lands in the window's
     centre.  Without this the window would show the frame's middle, which is
     not where the figure is. */
  const shift = crop ? Math.round(size * FIGURE_CX_FRAC - winW / 2) : 0;
  const canvasEl = (
    <canvas
      ref={ref}
      /* No width/height attributes: drawCharacterPortrait force-sets the
         backing store (and supersamples it by devicePixelRatio), so setting
         them here would be overwritten on the first draw and misleading to
         read. CSS owns the displayed size only. */
      aria-label="Your character"
      style={{ width: size, height: size, display: 'block', imageRendering: 'auto',
        marginLeft: -shift }}
    />
  );
  if (!crop) return canvasEl;
  return (
    <div style={{ width: winW, height: size, overflow: 'hidden', flex: 'none' }}>
      {canvasEl}
    </div>
  );
};
