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
export const CharacterView = ({ size }) => {
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
      onShirtColorChange,
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
    drawCharacterPortrait(cv, {
      dir: 'southwest',
      skin: getSkin(), pants: getPants(), shoes: getShoes(),
      hair,
      /* 'long' opts out of hair recolour in the creator's own wiring
         (characterCreatorEffects) — matched here so the two views cannot
         disagree about the same head. */
      hairColor: hair === 'long' ? null : hairColorTarget(getHairColor()),
      facialHair: getFacialHair(), facialHairColor: facialHairColorTarget(getFacialHairColor()),
      headwear: getHeadwear(), hatColor: hatColorTarget(getHatColor()),
      /* The shirt is a GEAR SLOT, not a trait — getShirt() is a different
         wardrobe with the same word on it, and reading the trait one here
         drew a bare-chested figure while the world sprite wore a tee.
         Caught by looking: __btWardrobe reported gearShirt 'tshirt' while
         this canvas rendered bare skin.  The COLOUR is still the trait
         (getShirtColor), which is what the world tints the gear sheet with
         and what join sends as `stc`. */
      shirt: getEquip('shirt'), shirtColor: shirtColorTarget(getShirtColor()),
      gear: { chest: getEquip('chest'), legs: getEquip('legs'), shoulders: getEquip('shoulders') },
      /* No groundShadow: the creator floats its figure on painted art where a
         contact shadow grounds it. Here it sits in a slate well, and a shadow
         with no floor under it reads as a smudge. */
      scale: Math.round((typeof window !== 'undefined' && window.devicePixelRatio) || 1),
    }).catch(() => { /* a missing sheet degrades to a bare figure, never a throw */ });
    return () => { alive = false; };
  }, [rev, size]);

  return (
    <canvas
      ref={ref}
      /* No width/height attributes: drawCharacterPortrait force-sets the
         backing store (and supersamples it by devicePixelRatio), so setting
         them here would be overwritten on the first draw and misleading to
         read. CSS owns the displayed size only. */
      aria-label="Your character"
      style={{ width: size, height: size, display: 'block', imageRendering: 'auto' }}
    />
  );
};
