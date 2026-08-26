import { drawCharacterPortrait, prewarmPortraitDirs } from '@/rendering/characterPortrait.js';
import { prewarmBaseSheets } from '@/rendering/pixiRenderer.js';
import { preloadTraitThumbs } from '@/rendering/traitThumbs.js';
import { setHairColor, hairColorTarget } from '@/rendering/traits/hairColorCatalog.js';
import { hatColorTarget } from '@/rendering/traits/hatColorCatalog.js';
import { facialHairColorTarget } from '@/rendering/traits/facialHairColorCatalog.js';
import { shirtColorTarget } from '@/rendering/traits/shirtColorCatalog.js';
import { onArtChange } from '@/rendering/traits/playerArt.js';   /* v2.3.1938; v2.3.1940 renamed — it covers pants and tattoos too */
import { onPatternChange } from '@/rendering/traits/patternCatalog.js';   /* v2.3.1941 */
import { heightMul, PORTRAIT_FIT } from '@/rendering/traits/buildCatalog.js';   /* v2.3.1953 */

/* === characterCreatorEffects — effect bodies for the character creator ===
   v2.3.897: extracted verbatim from three BroTown.jsx useEffects (the
   character-creator lifecycle glue). Behavior-frozen — bodies, guards, and
   cleanups are unchanged; each is called from a useEffect in BroTown that
   keeps the original dep array. The selection values come in as a `sel`
   object so the redraw body stays byte-identical (destructured back to the
   original local names at the top). */

/* Redraw the live preview portrait whenever a selection changes, and warm
   the other 7 angles for the current look.
   v2.3.1938: now RETURNS a cleanup, because a drawing is not a `sel` value --
   it changes stroke by stroke inside the paint panel, so this subscribes to the
   drawing store and redraws instead of waiting for the effect's dep list to
   change.  Callers already used the return value as a cleanup, so a real one
   slots straight in.  v2.3.1940: one subscription covers all four drawings
   (shirt front/back, pants, tattoo) -- the store notifies per canvas and the
   portrait redraws whole either way. */
/* ═══ v2.3.1947: ONE PLACE THAT TURNS SELECTIONS INTO PORTRAIT OPTIONS ═══
   The designer panel (PlayerPaint) grew its own character preview, and it has
   to show the SAME character the creator's stage is showing behind it — same
   skin, same recolour targets, same everything.  Two copies of this mapping
   would drift the first time a colour catalog changed, and the drift would be
   invisible until someone noticed the little preview wearing last month's hat
   colour.  So the mapping is a function, and both previews call it.

   Note what is deliberately NOT here: the drawings and the patterns.  Leaving
   `shirtArt`/`pantsArt`/`tattooArt`/`*Pattern` OUT of the options is what makes
   drawCharacterPortrait read them from the live store, so a stroke shows up in
   every preview without anyone threading it through. */
export function portraitLook(sel) {
  return {
    dir: sel.previewDir,
    skin: sel.skinSel, pants: sel.pantsSel, shoes: sel.shoesSel,
    hair: sel.hairSel, hairColor: sel.hairSel === 'long' ? null : hairColorTarget(sel.hairColorSel),
    facialHair: sel.facialHairSel, facialHairColor: facialHairColorTarget(sel.beardColorSel),
    headwear: sel.headwearSel, hatColor: hatColorTarget(sel.hatColorSel, sel.headwearSel), /* v2.3.1927 */
    shirt: sel.shirtSel, shirtColor: shirtColorTarget(sel.shirtColorSel),
    eyeColor: sel.eyeColor,   /* v2.3.1930: the creator's own live selection */
    /* v2.3.1953: height + frame.  Passed EXPLICITLY rather than left to the
       portrait's store fallback so the preview redraws the moment a build tile
       is tapped — the store write and this draw are the same tick, and the
       fallback would race it. */
    buildHeight: sel.buildHeight, buildFrame: sel.buildFrame,
  };
}

/* ═══ v2.3.1951: THE PREVIEW LOOKS AT WHAT YOU ARE CHANGING ═══
 *
 * Owner: "When it comes time to change eye color have the character get larger
 * (same effect as when you tap on him to zoom in a little).  I actually think
 * zooming and panning the camera a little within the character preview to
 * focus on the area being changed is a smart feature."
 *
 * Category framing DID exist once (v2.3.1308) and was retired in v2.3.1524 —
 * but for a different reason than this.  Back then the frames existed to slide
 * the character's legs behind a drawer that covered him, and when the pickers
 * moved into their own column there was nothing left to hide behind.  Focusing
 * on the thing you are editing is a new job, so this is a new mechanism.
 *
 * ── WHY THE CONTENT MOVES AND THE CANVAS DOES NOT ──
 * The old frames grew the canvas BOX (height %, bottom %).  That cannot do this
 * one: the column already renders the stage at scale(2) with overflow visible
 * and the bro deliberately spilling behind the picker pane (v2.3.1524), so
 * zooming the box further would push him further over the UI around him.
 * Instead the figure is composited off-screen at full size and a CROP of it is
 * blitted into the visible canvas.  The canvas's box never changes, so no
 * layout moves and no new overflow appears — only the pixels inside it pan and
 * zoom, which is exactly what "moving the camera" means.
 *
 * The crop rectangle is eased rather than cut, because a jump between two
 * framings reads as a glitch and a glide reads as a camera.
 *
 * MEASURED (v2.3.1947): the composite always puts the figure at x centre
 * 0.4975 with its feet at 0.977; the TOP moves with hats and hair, which is why
 * every frame below is stated against the canvas and anchored on the feet.
 */
/* v2.3.1953: the stage frame now has to contain the TALLEST build, because
   the composite draws every figure through PORTRAIT_FIT and a `tall` bro
   reaches y~0 (see buildCatalog).  0.99 tall, centred so it spans roughly
   [0, 0.985] — the whole composite, feet included.  Was { 0.55, 0.95 }: an
   average figure is ~10% smaller on the stage than it was, which is the
   unavoidable cost of a build system in a fixed box, and short/average/tall
   now fill 72% / 82% / 92% of it respectively — the difference you can
   actually see, which is the point. */
const FOCUS_FULL = { cy: 0.49, h: 0.99 };
/* ── HOW FAR IS "a little"? ──
   The first pass took the eye frame to 0.17 of the canvas and it was wrong in
   three ways at once, all visible in one render: the head filled the panel and
   was cut off at both sides, the two rotate buttons — which live at a fixed
   27% up the stage — landed squarely on the eyes, and the whole thing read as
   a face transplant rather than a camera nudge.  The owner asked for "a
   little".  These frames keep the whole head (or the whole garment) in shot
   with room around it, so the move reads as attention rather than as a jump
   cut, and nothing lands under the rotate controls. */
const CAT_FOCUS = {
  hair: { cy: 0.30, h: 0.44 },
  hat: { cy: 0.28, h: 0.46 },
  eyes: { cy: 0.31, h: 0.36 },
  beard: { cy: 0.33, h: 0.38 },
  /* Skin is the whole body, so it gets the whole body. */
  skin: FOCUS_FULL,
  shirt: { cy: 0.47, h: 0.56 },
  pants: { cy: 0.66, h: 0.52 },
  shoes: { cy: 0.80, h: 0.44 },
  /* v2.3.1953: build is a SILHOUETTE, which is the one thing you cannot judge
     zoomed in — the whole figure, stated rather than left to the fallback so
     nobody later "fixes" it into a torso crop. */
  build: FOCUS_FULL,
};
/* Measured in v2.3.1947: the figure is centred here in every composite. */
const FIG_CX = 0.4975;
/* Per-frame approach fraction.  0.18 lands a category change in ~200ms at
   60fps, which is the same 180ms the retired frames used and reads as a camera
   move rather than a cut. */
const CAM_EASE = 0.18;
/* The figure's measured vertical bounds in the composite: feet at 0.977, and
   nothing above 0.05 even with a sombrero over an afro. */
/* v2.3.1953: 0 rather than 0.05.  With a build in play a `tall` figure's
   crown reaches the very top of the composite (that is what PORTRAIT_FIT is
   sized for), so the old bound would have declared the head to be below a
   frame edge it is actually crossing and skipped the dissolve — the one thing
   v2.3.1309 settled must never happen. */
const FIG_TOP = 0;
const FIG_BOT = 0.977;
/* How much of the canvas a cut edge dissolves over. */
const FADE_BAND = 0.13;
/* One offscreen composite for the whole session: it is re-drawn in place on
   every change, and a new one per wiring would churn a 768px canvas every time
   a trait is picked. */
let _offCanvas = null;
/* Where the camera is RIGHT NOW, kept across re-wirings so changing a trait
   mid-glide does not snap it back to the start. */
let _cam = null;

/* v2.3.1953: `buildK` is PORTRAIT_FIT times this player's height multiplier —
   how much the composite's figure has been scaled about its FEET relative to
   the frames below, which were measured before builds existed.
 *
 * The CATEGORY frames are anchored on BODY PARTS (the hair frame is where the
 * hair is), so they ride the same feet-anchored transform the figure does:
 * a tall bro's head is higher up the canvas, and a frame that stayed put would
 * miss it.  Mapping is exact — scale a point about the feet, scale the window
 * by the same factor.
 *
 * FOCUS_FULL deliberately does NOT ride it: it is the STAGE, a fixed frame the
 * figure is measured against.  Scaling it with the build would cancel the
 * growth exactly, and tapping `tall` would change nothing on screen — which is
 * the one outcome this feature cannot have. */
export function focusForCat(cat, zoomedOut, buildK) {
  if (zoomedOut) return FOCUS_FULL;
  const f = CAT_FOCUS[cat];
  if (!f || f === FOCUS_FULL) return FOCUS_FULL;
  const k = (typeof buildK === 'number' && buildK > 0) ? buildK : 1;
  if (k === 1) return f;
  return { cy: FIG_BOT + (f.cy - FIG_BOT) * k, h: f.h * k };
}

export function wireCharacterPortrait(previewCanvasRef, sel) {
  /* v2.3.1947: only the three the PREWARM needs are unpacked now; everything
     else the draw wants goes through portraitLook(sel). */
  var hairSel = sel.hairSel, facialHairSel = sel.facialHairSel,
    headwearSel = sel.headwearSel;
  if (!previewCanvasRef.current) return;
  var visible = previewCanvasRef.current;
  /* v2.3.1951: the figure is composited HERE and blitted, cropped, into the
     canvas on screen.  One offscreen per wiring, reused across redraws. */
  var off = _offCanvas || (_offCanvas = document.createElement('canvas'));
  /* v2.3.1938: the draw is a closure so the shirt-drawing subscription below
     can re-run just the DRAW.  Calling wireCharacterPortrait itself would
     re-subscribe on every stroke and pile up listeners. */
  function draw() {
  return drawCharacterPortrait(off, Object.assign(portraitLook(sel), {
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
  })).then(function () {
    /* v2.3.715: warm the other 7 angles for whatever is selected NOW, so
       rotating never waits on the network. */
    prewarmPortraitDirs({ hair: hairSel, facialHair: facialHairSel, headwear: headwearSel });
    blit();
  });
  }

  /* ── the camera ──
     `_cam` is where it is now; `target` is where the category wants it.  The
     ease runs only while they differ, so a still preview costs nothing. */
  /* v2.3.1953: how much the composite's figure has been scaled about its feet
     — the portrait's global fit times this player's own height.  The category
     frames were measured against an unscaled figure, so they ride it. */
  var target = focusForCat(sel.activeCat, sel.zoomedOut,
    PORTRAIT_FIT * heightMul(sel.buildHeight));
  if (!_cam) _cam = { cy: target.cy, h: target.h };
  var raf = 0;
  function blit() {
    if (!off.width || !visible) return;
    var box = visible.getBoundingClientRect();
    if (!box.width || !box.height) return;
    var dpr = Math.min(3, Math.round(window.devicePixelRatio || 1));
    var w = Math.round(box.width * dpr), h = Math.round(box.height * dpr);
    if (visible.width !== w || visible.height !== h) { visible.width = w; visible.height = h; }
    var ctx = visible.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, w, h);
    var S = off.width;                       /* the composite is square */
    var winH = _cam.h * S;
    var winW = winH * (box.width / box.height);
    ctx.drawImage(off, FIG_CX * S - winW / 2, _cam.cy * S - winH / 2, winW, winH, 0, 0, w, h);
    /* ── DO NOT SLICE HIM OFF AGAINST THIN AIR ──
       v2.3.1309 (owner) settled this once already for the retired frames: a
       frame that cuts the sprite leaves a hard horizontal edge with the
       pedestal art showing through underneath, and it reads as the character
       having been chopped in half.  A zoomed camera always cuts somewhere — a
       head frame ends mid-torso and a boot frame starts mid-torso, by
       definition — so the cut edge is faded and the body dissolves instead.

       Per EDGE, not both: fading an edge the figure does not reach is at best
       invisible and at worst eats the top of a tall hat.  MEASURED bounds
       (v2.3.1947): the feet land at 0.977 down the composite every time, and
       nothing reaches above 0.05 even with a sombrero over an afro. */
    const top = _cam.cy - _cam.h / 2, bot = _cam.cy + _cam.h / 2;
    const band = Math.round(h * FADE_BAND);
    if (band > 2) {
      ctx.globalCompositeOperation = 'destination-out';
      if (bot < FIG_BOT) {          /* the body continues below the frame */
        const g = ctx.createLinearGradient(0, h - band, 0, h);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, 'rgba(0,0,0,1)');
        ctx.fillStyle = g;
        ctx.fillRect(0, h - band, w, band);
      }
      if (top > FIG_TOP) {          /* ...and above it */
        const g2 = ctx.createLinearGradient(0, band, 0, 0);
        g2.addColorStop(0, 'rgba(0,0,0,0)');
        g2.addColorStop(1, 'rgba(0,0,0,1)');
        ctx.fillStyle = g2;
        ctx.fillRect(0, 0, w, band);
      }
      ctx.globalCompositeOperation = 'source-over';
    }
  }
  function step() {
    raf = 0;
    var dcy = target.cy - _cam.cy, dh = target.h - _cam.h;
    /* Close enough to stop: below a quarter of a percent of the frame nobody
       can see the remaining difference, and an ease that never terminates
       keeps a rAF alive behind a screen the player has left. */
    if (Math.abs(dcy) < 0.0015 && Math.abs(dh) < 0.0015) {
      _cam.cy = target.cy; _cam.h = target.h; blit(); return;
    }
    _cam.cy += dcy * CAM_EASE; _cam.h += dh * CAM_EASE;
    blit();
    raf = requestAnimationFrame(step);
  }
  draw();
  if (raf) cancelAnimationFrame(raf);
  raf = requestAnimationFrame(step);
  /* Redraw on every stroke in the designer -- a drawing is not one of the
     `sel` values, so nothing else would re-run this. */
  var _redraw = function () { try { draw(); } catch (e) { /* ignore */ } };
  var _offArt = onArtChange(_redraw);
  /* v2.3.1941: patterns live in their own store for the same reason -- they are
     not `sel` values either, and they change from inside the same panel. */
  var _offPat = onPatternChange(_redraw);
  /* The visible canvas is sized from its own layout box, so a rotate or a
     resize has to re-blit even when nothing was redrawn. */
  var _onResize = function () { try { blit(); } catch (e) { /* ignore */ } };
  window.addEventListener('resize', _onResize);
  return function () {
    if (raf) cancelAnimationFrame(raf);
    window.removeEventListener('resize', _onResize);
    try { _offArt(); } catch (e) { /* ignore */ }
    try { _offPat(); } catch (e) { /* ignore */ }
  };
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
