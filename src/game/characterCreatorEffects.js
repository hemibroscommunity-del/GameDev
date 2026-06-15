import { drawCharacterPortrait, prewarmPortraitDirs } from '@/rendering/characterPortrait.js';
import { prewarmBaseSheets } from '@/rendering/pixiRenderer.js';
import { setHairColor, hairColorTarget } from '@/rendering/traits/hairColorCatalog.js';
import { hatColorTarget } from '@/rendering/traits/hatColorCatalog.js';
import { facialHairColorTarget } from '@/rendering/traits/facialHairColorCatalog.js';
import { shirtColorTarget } from '@/rendering/traits/shirtColorCatalog.js';

/* === characterCreatorEffects — effect bodies for the character creator ===
   v2.3.897: extracted verbatim from three BroTown.jsx useEffects (the
   character-creator lifecycle glue). Behavior-frozen — bodies, guards, and
   cleanups are unchanged; each is called from a useEffect in BroTown that
   keeps the original dep array. The selection values come in as a `sel`
   object so the redraw body stays byte-identical (destructured back to the
   original local names at the top). */

/* Redraw the live preview portrait whenever a selection changes, and warm
   the other 7 angles for the current look. No cleanup (matches original). */
export function wireCharacterPortrait(previewCanvasRef, sel) {
  var previewDir = sel.previewDir,
    skinSel = sel.skinSel, pantsSel = sel.pantsSel, shoesSel = sel.shoesSel,
    hairSel = sel.hairSel, hairColorSel = sel.hairColorSel,
    facialHairSel = sel.facialHairSel, beardColorSel = sel.beardColorSel,
    headwearSel = sel.headwearSel, hatColorSel = sel.hatColorSel,
    shirtSel = sel.shirtSel, shirtColorSel = sel.shirtColorSel;
  if (!previewCanvasRef.current) return;
  drawCharacterPortrait(previewCanvasRef.current, {
    dir: previewDir,
    skin: skinSel, pants: pantsSel, shoes: shoesSel,
    hair: hairSel, hairColor: hairSel === 'long' ? null : hairColorTarget(hairColorSel),
    facialHair: facialHairSel, facialHairColor: facialHairColorTarget(beardColorSel),
    headwear: headwearSel, hatColor: hatColorTarget(hatColorSel),
    shirt: shirtSel, shirtColor: shirtColorTarget(shirtColorSel),
  });
  /* v2.3.715: warm the other 7 angles for whatever is selected NOW, so
     rotating never waits on the network. */
  prewarmPortraitDirs({ hair: hairSel, facialHair: facialHairSel, headwear: headwearSel });
}

/* The welcome modal is dead network time: 2.5s after it opens, start
   pulling the heavy in-game sheets and warm the intro clip (held in
   introWarmRef so the prefetch isn't GC'd). Returns the clearTimeout
   cleanup; early-returns (no cleanup) when the modal isn't showing. */
export function wireSplashPrewarm(showNameModal, introWarmRef) {
  if (!showNameModal) return;
  /* v2.3.717: prewarm DELAYED 2.5s -- kicking it immediately had the
     game sheets racing the welcome screen's own theme art for
     bandwidth, which is exactly the "modal loads slow" complaint.
     Let the visible UI finish dressing first. */
  var t = setTimeout(function () {
    try { prewarmBaseSheets(); } catch (e) {}
    try {
      var v = document.createElement('video');
      v.preload = 'auto';
      v.muted = true;
      v.src = '/intro/brotown-intro.mp4';
      v.load();
      introWarmRef.current = v;
    } catch (e) {}
  }, 2500);
  return function () { clearTimeout(t); };
}

/* The long-hair sprite is ~88% pure black, so a light hair color over-
   processes into a black band; clamp the selection to dark when 'long' is
   picked. No cleanup. */
export function clampLongHairColor(hairSel, hairColorSel, setHairColorSel) {
  var LONG_HAIR_COLORS = ['black'];
  if (hairSel === 'long' && LONG_HAIR_COLORS.indexOf(hairColorSel) === -1) {
    setHairColor(LONG_HAIR_COLORS[0]); setHairColorSel(LONG_HAIR_COLORS[0]);
  }
}
