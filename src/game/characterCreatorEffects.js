import { drawCharacterPortrait, prewarmPortraitDirs } from '@/rendering/characterPortrait.js';
import { prewarmBaseSheets } from '@/rendering/pixiRenderer.js';
import { preloadTraitThumbs } from '@/rendering/traitThumbs.js';
import { setHairColor, hairColorTarget } from '@/rendering/traits/hairColorCatalog.js';
import { hatColorTarget } from '@/rendering/traits/hatColorCatalog.js';
import { facialHairColorTarget } from '@/rendering/traits/facialHairColorCatalog.js';
import { shirtColorTarget } from '@/rendering/traits/shirtColorCatalog.js';
import { onShirtArtChange } from '@/rendering/traits/shirtArt.js';   /* v2.3.1938 */

/* === characterCreatorEffects — effect bodies for the character creator ===
   v2.3.897: extracted verbatim from three BroTown.jsx useEffects (the
   character-creator lifecycle glue). Behavior-frozen — bodies, guards, and
   cleanups are unchanged; each is called from a useEffect in BroTown that
   keeps the original dep array. The selection values come in as a `sel`
   object so the redraw body stays byte-identical (destructured back to the
   original local names at the top). */

/* Redraw the live preview portrait whenever a selection changes, and warm
   the other 7 angles for the current look.
   v2.3.1938: now RETURNS a cleanup, because the shirt drawing is not a
   `sel` value -- it changes stroke by stroke inside the paint panel, so this
   subscribes to the drawing store and redraws instead of waiting for the
   effect's dep list to change.  Callers already used the return value as a
   cleanup, so a real one slots straight in. */
export function wireCharacterPortrait(previewCanvasRef, sel) {
  var previewDir = sel.previewDir,
    skinSel = sel.skinSel, pantsSel = sel.pantsSel, shoesSel = sel.shoesSel,
    hairSel = sel.hairSel, hairColorSel = sel.hairColorSel,
    facialHairSel = sel.facialHairSel, beardColorSel = sel.beardColorSel,
    headwearSel = sel.headwearSel, hatColorSel = sel.hatColorSel,
    shirtSel = sel.shirtSel, shirtColorSel = sel.shirtColorSel;
  if (!previewCanvasRef.current) return;
  /* v2.3.1938: the draw is a closure so the shirt-drawing subscription below
     can re-run just the DRAW.  Calling wireCharacterPortrait itself would
     re-subscribe on every stroke and pile up listeners. */
  function draw() {
  drawCharacterPortrait(previewCanvasRef.current, {
    dir: previewDir,
    skin: skinSel, pants: pantsSel, shoes: shoesSel,
    hair: hairSel, hairColor: hairSel === 'long' ? null : hairColorTarget(hairColorSel),
    facialHair: facialHairSel, facialHairColor: facialHairColorTarget(beardColorSel),
    headwear: headwearSel, hatColor: hatColorTarget(hatColorSel, headwearSel), /* v2.3.1927 */
    shirt: shirtSel, shirtColor: shirtColorTarget(shirtColorSel),
    eyeColor: sel.eyeColor,   /* v2.3.1930: the creator's own live selection */
    /* v2.3.1300: baked contact shadow — login preview only (exports and
       headshots keep a clean figure). */
    groundShadow: true,
    /* v2.3.1580: composite at device resolution — login preview ONLY.
       This canvas is displayed through .bt-cc-col-left>.bt-cc-stage's
       scale(2), so a 3x phone was browser-stretching a finished 256
       composite by ~3.75x: two chained resamples of the whole character.
       The body sprite is natively 256, so that was discarding real detail
       before it ever reached a pixel.  Capped at 3 in drawCharacterPortrait
       (a 768 canvas; 4x would be 1024 for no visible gain).
       Every other caller omits `scale` and keeps the exact 256 path,
       because portraitDataUrl's headshot crop uses raw pixel coords. */
    scale: Math.round(window.devicePixelRatio || 1),
  });
  /* v2.3.715: warm the other 7 angles for whatever is selected NOW, so
     rotating never waits on the network. */
  prewarmPortraitDirs({ hair: hairSel, facialHair: facialHairSel, headwear: headwearSel });
  }
  draw();
  /* Redraw on every stroke in the shirt designer -- the drawing is not one of
     the `sel` values, so nothing else would re-run this. */
  var _offArt = onShirtArtChange(function () { try { draw(); } catch (e) { /* ignore */ } });
  return function () { try { _offArt(); } catch (e) { /* ignore */ } };
}

/* The welcome modal is dead network time: 2.5s after it opens, start
   pulling the heavy in-game sheets and warm the intro clip (held in
   introWarmRef so the prefetch isn't GC'd). Returns the clearTimeout
   cleanup; early-returns (no cleanup) when the modal isn't showing. */
export function wireSplashPrewarm(showNameModal, introWarmRef) {
  if (!showNameModal) return;
  /* v2.3.1022: warm the starting-zone (town) map IMMEDIATELY -- it's a single
     small PNG and is the direct fix for the black-world-on-join flash, so it
     gets a head start (well before the ≥3s intro dismiss) without competing
     meaningfully with the welcome theme art. */
  try { import('@/rendering/tiledMaps.js').then((m) => m.preloadStartZoneMap('town')).catch(function () {}); } catch (e) {}
  /* v2.3.1023: warm the trait thumbnails (hair/hat/beard/shirt) up front so the
     customizer's category tiles appear instantly instead of fetching on tab
     open.  Cheap now that the thumbs are shrunk to 128px (~191KB total). */
  try { preloadTraitThumbs(); } catch (e) {}
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
