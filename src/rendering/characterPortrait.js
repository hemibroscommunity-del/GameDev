/* Character portrait compositor.
 *
 * Builds a south-facing standing portrait of the player from the current
 * cosmetic selections (skin tone, hair style + color, facial hair,
 * headwear) by compositing the same sprite layers the in-game renderer
 * uses, with the SAME crown-anchored placement math (body-tops.json crown
 * + per-trait meta anchors / nudges / scale).  Output is an HTMLCanvasElement
 * the caller can show directly (login live-preview) or read as a data URL
 * (top-right profile picture).
 *
 * It mirrors entityRenderer._placeTrait for the single (pose=stand,
 * dir=south, frame=0, mirror=false) case -- see that function for the
 * authoritative version.  Skin recolor reuses playerSkins' tone + method;
 * hair recolor tints every opaque hair pixel by brightness ratio (the hair
 * sheet is hair-only, so no region isolation is needed).
 */

import { skinTarget, pantsTarget, shoesTarget, recolorBodyToCanvas } from './playerSkins.js';
import EYE_MASK from './eyeMask.json';                              /* v2.3.1928 */
import { eyeColorTarget } from './traits/eyeColorCatalog.js';
import { SPRITE_VERSION } from './playerSprites.js';
import { getHatRef } from './traits/hatColorCatalog.js';
import { materialIndex } from './traits/traitMaterials.js'; /* v2.3.1926 */
import { headwearIsSolid } from './traits/headwearCatalog.js';
import { SOLID_ONLY_HAT_COLOR } from './traits/recolorOptions.js'; /* v2.3.1109: shared per-hat recolour reference (call-time use; cyclic import is safe) */
import { upscaleToFrameHeight } from './spriteScale.js'; /* v2.3.1110: restore downscaled shirt sheet to 256 frame */
/* v2.3.1815: worn armour in the portrait.  gearArt resolves a recoloured set
   to its DONOR sheet (copperplate -> steelplate) and materialRgb gives the
   metal to multiply it by — the same two-step the world renderer uses, so a
   copper plate cannot come out steel here while it is copper in play. */
import { gearArt, gearMaterial } from './gearVariants.js';
import { materialRgb, weaponMaterial } from './traits/materialTints.js'; /* v2.3.1842: weapons share the metals table */

import { weaponArtUrl } from './weaponSprites.js';        /* v2.3.1841 */
import { getShieldArt } from './shieldSprites.js';        /* v2.3.1841 */
import { getWeaponHandle, getAnchor } from './playerAnchors.js'; /* v2.3.1841 */

const FRAME = 256;

/* ═══ v2.3.1841: THE KIT YOU ARE ACTUALLY HOLDING ═══
 *
 * Owner: "It should also reflect the currently equipped items (like sword and
 * shield) but right now it doesn't."
 *
 * The armour slots were already here (v2.3.1815) because armour ships as
 * body-ALIGNED sheets — draw them at (0,0,FRAME,FRAME) and they land on the
 * body by construction.  A weapon and a shield are not aligned sheets: the
 * world places them, one from a grip anchor and one from an offset off the
 * body's centre, and both are stated in WORLD pixels.
 *
 * So the numbers are converted rather than re-invented.  Everything below is
 * derived from constants that live in the modules that own them:
 *   - the ART comes from weaponArtUrl / getShieldArt, so the per-facing keys,
 *     gearBase variants, mirror rules and cache-busting versions stay in one
 *     place;
 *   - the HAND comes from getAnchor, the same per-frame anchor the world pins
 *     weapons to, and it is already in this 256 frame's coordinates;
 *   - the SHIELD's offset comes from backShield.js's own numbers.
 *
 * THE ONE CONVERSION, and where it comes from: the world renders the body at
 * paintedHeight * dirScale * LOCAL_SCALE, and v2.3.1836 measured
 * paintedHeight * dirScale to be 200.5 for every facing (that is what the
 * dir-scale is FOR).  With LOCAL_SCALE 0.421875 the body is 84.58 world px
 * tall, so any world size converts to a fraction of the body:
 *      fractionOfBody = worldPx / 84.58
 * and this canvas multiplies that by the figure's own painted height.  One
 * ratio, stated once, instead of a second placement table to keep in step. */
const WORLD_BODY_PX = 200.5 * 0.421875;   /* 84.58 — see above */
/* Held greatsword target height in world px (entityRenderer: 48 for the
   per-facing art).  Sheathed/other types differ; the equip screen shows the
   held pose, which is the one the player is looking at. */
const WORLD_WEAPON_PX = { greatsword: 48, sword: 26, 'sword:wood': 45, bow: 52, staff: 34 };
/* Lowest opaque row of each stand sheet — the same measured feet the ground
   shadow below uses, and the same rows entityRenderer's BODY_ROWS carries. */
const FOOT_ROW = { south: 221, north: 219, east: 223, northeast: 227, southwest: 234 };
const DEFAULT_LIT_LUM = 149;            // default lit-skin luminance (see playerSkins)
const TRAIT_VER = '2.3.1561';            // cache-bust for body-tops.json (matches entityRenderer)
/* v2.3.1815: matches gearSheets.js GEAR_VERSION so the portrait and the world
   pull the SAME cached bytes rather than a second copy under a different
   query string. */
const GEAR_ART_VER = '2.3.1656';

/* v2.3.1579: the portrait prefers the 256px `hi/` art.
 *
 * v2.3.1526 halved every trait frame to 128 to save GPU texture memory, and
 * that saving is real — preloadTraits() puts every catalog entry x 5 dirs on
 * the Pixi startup gate, where a 256 frame costs 256KB of VRAM regardless of
 * the PNG size (48 ids: ~62MB at 256, ~15.7MB at 128).  On the iPhone this
 * game targets, that must not be undone.
 *
 * But THIS file is not part of that pipeline.  It is a 2D-canvas compositor
 * that builds a 256x256 bitmap which NameModal then CSS-upscales to fill the
 * stage with image-rendering: pixelated.  A 128px hat therefore gets enlarged
 * twice — 2x into the bitmap, then again to the stage, the second one
 * deliberately hard-edged — and sits next to a body drawn from 256-native art.
 * That mismatch is what reads as low quality on the login screen (owner).
 *
 * So the portrait loads `<id>/hi/<dir>.png` when it exists and falls back to
 * the shipped 128 otherwise.  Zero VRAM cost: nothing in the Pixi preload
 * path looks in `hi/`.  placeTrait already normalises by texture width
 * (`norm = FRAME / naturalWidth`), so 256 art needs no placement change — and
 * it also flips imageSmoothingEnabled back on, since norm becomes 1 and there
 * is no longer an upscale to keep crisp.  tools/restore-trait-hires.mjs
 * recovers the art from the commit before the halving. */
function traitUrl(cat, id, dir) {
  return `/sprites/traits/${cat}/${id}/${dir}.png?v=${TRAIT_VER}`;
}
function traitUrlHi(cat, id, dir) {
  return `/sprites/traits/${cat}/${id}/hi/${dir}.png?v=${TRAIT_VER}`;
}
/* Try hi-res, fall back to the shipped frame.  A missing hi/ file is an
   expected, silent outcome — not every id has one. */
function loadTraitBest(cat, id, dir) {
  return loadImage(traitUrlHi(cat, id, dir)).catch(() => loadImage(traitUrl(cat, id, dir))).catch(() => null);
}

/* ── tiny async caches ── */
const _imgCache = new Map();            // url -> Promise<HTMLImageElement>
const _metaCache = new Map();           // 'cat/id' -> Promise<meta|null>
let _bodyTopsPromise = null;

function loadImage(url) {
  if (_imgCache.has(url)) return _imgCache.get(url);
  const p = new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = url;
  });
  _imgCache.set(url, p);
  return p;
}

function loadMeta(cat, id) {
  const key = cat + '/' + id;
  if (_metaCache.has(key)) return _metaCache.get(key);
  const p = fetch(`/sprites/traits/${cat}/${id}/meta.json?v=${TRAIT_VER}`)
    .then(r => (r.ok ? r.json() : null))
    .catch(() => null);
  _metaCache.set(key, p);
  return p;
}

function loadBodyTops() {
  if (!_bodyTopsPromise) {
    _bodyTopsPromise = fetch(`/sprites/player/body-tops.json?v=${TRAIT_VER}`)
      .then(r => (r.ok ? r.json() : null))
      .catch(() => null);
  }
  return _bodyTopsPromise;
}

/* ── recolor helpers (return a 256-canvas) ──
   Body (skin + pants + shoes) reuses playerSkins.recolorBodyToCanvas so the
   preview matches the in-game recolor exactly. */
export function recolorHairToCanvas(img, hairColor, refOverride) {
  const cv = document.createElement('canvas');
  cv.width = img.width; cv.height = img.height;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  if (!hairColor) return cv;
  const data = ctx.getImageData(0, 0, cv.width, cv.height);
  const d = data.data;
  /* reference = ~mean luminance of the hair's own opaque pixels, so the chosen
     color lands on the lit strands and shadows scale down (keeping the near-
     black outline dark, consistent with the rest of the character's outline).
     NOTE: this collapses very dark sprites (the long-hair sheet is ~88% pure
     black) into a black band when given a light color -- that style restricts
     its color picker to dark options for this reason (see BroTown hair colors).
     v2.3.1109: refOverride lets the caller pass ONE shared reference for all of
     a multi-direction trait (e.g. a hat across its 5 facings) so the recoloured
     tone is identical per angle instead of drifting with each sheet's own
     outline-vs-fabric pixel mix. */
  /* v2.3.1926: refOverride is either a plain reference number (hair, beard,
     shirt — unchanged) or a MATERIAL PROFILE from traitMaterials.js, which
     carries the reference plus which material is the trait's own colour.  With
     a profile, only that material is recoloured and every other one — the
     Kermit hat's eyes, the shark's teeth, the black outline — keeps what it
     was drawn with.  A single-material trait recolours every pixel, so its
     output is identical either way. */
  const prof = (refOverride && typeof refOverride === 'object') ? refOverride : null;
  let ref = prof ? prof.ref : refOverride;
  if (!ref) {
    let sum = 0, n = 0, maxL = 1;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] > 30) {
        const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        sum += l; n++; if (l > maxL) maxL = l;
      }
    }
    ref = Math.max(1, n ? (sum / n) * 1.15 : maxL);
  }
  const tr = hairColor[0], tg = hairColor[1], tb = hairColor[2];
  /* main < 0 means "no material is special here" -- either the trait has none
     or its entry says 'all' -- so every pixel recolours, which is today's map. */
  const main = prof ? prof.main : -1;
  const mats = (prof && main >= 0) ? prof.mats : null;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] > 30) {
      if (mats && materialIndex(d[i], d[i + 1], d[i + 2], mats) !== main) continue;
      const k = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / ref;
      d[i] = Math.min(255, Math.round(tr * k));
      d[i + 1] = Math.min(255, Math.round(tg * k));
      d[i + 2] = Math.min(255, Math.round(tb * k));
    }
  }
  ctx.putImageData(data, 0, 0);
  return cv;
}

/* v2.3.1561: mirror of entityRenderer._floatAboveHairLift — the halo is not
   worn, it floats, so its clearance has to be measured against the HAIR being
   drawn under it rather than baked into its meta as a fixed crown offset.
   entityRenderer.js is the source of truth for the two constants; this file
   deliberately re-implements the placement math (see placeTrait below) and
   this follows the same convention.  The character-creation preview is where
   the owner spotted the halo sitting on the hair, so the portrait needs this
   as much as the world renderer does. */
const FLOAT_BASE = 12;
const FLOAT_GAP = 5;
function floatLift(meta, hairMeta, dir) {
  if (!(meta && meta.floatsAboveHair)) return 0;
  const topOf = (m) => {
    const cn = (m.crownNudge && m.crownNudge[dir]) || [0, 0];
    const pn = (m.poseNudge && m.poseNudge.stand && m.poseNudge.stand[dir]) || [0, 0];
    return cn[1] + pn[1];
  };
  const bbox = (meta.bboxes && meta.bboxes[dir]) || null;
  const bottom = topOf(meta) + ((bbox && bbox[3]) || 0);
  const hairTop = hairMeta ? topOf(hairMeta) : 0;
  return Math.min(0, Math.min(-FLOAT_BASE, hairTop - FLOAT_GAP) - bottom);
}

/* Place one trait sprite (already recolored if needed) onto ctx using the
   stand/<dir> meta math.  Mirrors entityRenderer._placeTrait. */
function placeTrait(ctx, traitImg, meta, crown, dir, liftY) {
  if (!traitImg || !meta || !meta.fullFrame || !meta.anchors || !meta.anchors[dir]) return;
  const anchor = meta.anchors[dir];
  const cn = (meta.crownNudge && meta.crownNudge[dir]) || [0, 0];
  const pn = (meta.poseNudge && meta.poseNudge.stand && meta.poseNudge.stand[dir]) || [0, 0];
  const sc = (meta.scale && meta.scale[dir]) || 1;
  const sbp = (meta.scaleByPose && meta.scaleByPose.stand && meta.scaleByPose.stand[dir]) || 1;
  const dscale = sc * sbp;
  const tx = crown[0] + cn[0] + pn[0];
  const ty = crown[1] + cn[1] + pn[1] + (liftY || 0); /* v2.3.1561: float-above-hair clearance */
  /* v2.3.1526: same normalisation as entityRenderer._placeTrait. meta is in
     256-space; the texture is 128 now, so scale by 256/texWidth and offset the
     anchor in texture pixels. A trait still stored at 256 gets norm=1. */
  const norm = FRAME / ((traitImg.naturalWidth || traitImg.width) || FRAME);
  ctx.save();
  /* Nearest when we are enlarging: the trait is pixel art and the portrait is
     itself displayed smaller than this canvas, so a smoothed 2x upscale here
     only softens edges that the display-side downscale would have kept. */
  ctx.imageSmoothingEnabled = norm <= 1;
  ctx.translate(tx, ty);
  ctx.scale(dscale * norm, dscale * norm);
  ctx.drawImage(traitImg, -anchor[0] / norm, -anchor[1] / norm);
  ctx.restore();
}

/* Render one trait to its own native FRAME canvas (used for hair so it can
   be mask-clipped before compositing). */
function renderTraitCanvas(traitImg, meta, crown, dir) {
  const cv = document.createElement('canvas');
  cv.width = FRAME; cv.height = FRAME;
  placeTrait(cv.getContext('2d'), traitImg, meta, crown, dir);
  return cv;
}

/** Composite the portrait into `canvas` (sized to FRAME).  Layers, in
 *  order: skin-recolored body, hair (recolored), facial hair, headwear.
 *  Unknown / 'none' / 'default' selections are skipped.  Resolves when the
 *  draw completes (after async asset loads).  Safe to call repeatedly. */
export async function drawCharacterPortrait(canvas, opts) {
  if (!canvas) return;
  const { skin, pants, shoes, hair, hairColor, facialHair, facialHairColor, headwear, hatColor, shirt, shirtColor, dir, gear, weapon, shield } = opts || {};
  /* v2.3.1580 (owner: traits still soft after the v2.3.1579 re-bake).
     OPT-IN supersampling.  This canvas has always composited at a fixed
     256 with no devicePixelRatio scaling -- the WORLD canvas is DPR-aware
     (BroTown.jsx) but this one never was.  On the login screen the result
     is then displayed through .bt-cc-col-left>.bt-cc-stage's scale(2), so
     a 3x phone browser-stretches the finished 256 composite by ~3.75x.
     That is TWO chained resamples of everything -- body, hair, shirt,
     hats -- and the body sprite is natively 256, so real detail was being
     thrown away before it ever reached the screen.

     Compositing at FRAME*scale instead makes it ONE resample.  It cannot
     invent detail in a 128px trait, but it stops the composite itself
     being blurred, which is why this sharpens the WHOLE character rather
     than only the hats.

     Deliberately opt-in and defaulted to 1: portraitDataUrl's headshot
     path crops with RAW PIXEL coordinates (HEAD_CROP), and the inspect
     panel, friend portraits and the dashboard profile picture all ride
     that path.  Scaling the canvas globally would silently crop the wrong
     region in three places.  Only the login preview passes a scale; every
     other caller keeps byte-identical behaviour. */
  const S = Math.max(1, Math.min(3, Math.round(Number(opts && opts.scale) || 1)));
  /* v2.3.715: composite OFFSCREEN and blit at the end.  This used to set
     canvas.width up front, which blanks the visible canvas synchronously --
     then the awaits below yield at least a frame, so every rotation /
     selection change flashed blank even with all assets cached.  The old
     frame now stays up until the new one is ready.  `__pseq` drops stale
     async draws that would land out of order during rapid rotation. */
  const seq = (canvas.__pseq = (canvas.__pseq || 0) + 1);
  const work = document.createElement('canvas');
  work.width = FRAME * S; work.height = FRAME * S;
  const ctx = work.getContext('2d');
  /* Every draw below stays in 256-space; the base transform rasterises it
     at device resolution.  Nothing in this file calls setTransform or
     resetTransform, and the save()/restore() pair around the figure
     preserves this, so the anchor/crown/zoom maths is untouched. */
  if (S !== 1) ctx.setTransform(S, 0, 0, S, 0, 0);
  if (typeof ctx.imageSmoothingQuality === 'string' || 'imageSmoothingQuality' in ctx) {
    ctx.imageSmoothingQuality = 'high';
  }

  /* Preview angle -- any of the 8 compass directions (default southwest 3/4).
     The 3 mirrored views (west / northwest / southeast) reuse the opposite
     base sprite and flip the whole composite horizontally. */
  const _DMAP = { east: ['east', false], west: ['east', true], north: ['north', false],
    south: ['south', false], northeast: ['northeast', false], northwest: ['northeast', true],
    southwest: ['southwest', false], southeast: ['southwest', true] };
  const _dm = _DMAP[dir] || _DMAP.southwest;
  const DIR = _dm[0], _mirror = _dm[1];
  const wantHair = hair && hair !== 'none';
  const wantFh = facialHair && facialHair !== 'none';
  const wantHw = headwear && headwear !== 'none';
  /* ═══ v2.3.1815: WORN ARMOUR ═══
     Owner: "Should show armor worn etc if player is wearing it."

     Three things make this safe to composite here rather than needing the
     world renderer.  (1) The layer ORDER is the renderer's own _GEAR_SLOTS
     order — shirt, legs, chest, shoulders — read off entityRenderer rather
     than guessed.  (2) The renderer's pre-composed FULLSET figure, which
     replaces the body wholesale when a matched set is worn, is gated on
     `pose !== 'jog'` and returns null for anything else — so a STANDING
     figure is always the plain layered path and there is no substitution to
     mirror here.  (3) The shirt is hidden under a chest piece, which is the
     renderer's own rule (v2.3.809, owner's call) and matters because the
     plate silhouette is not a strict superset of the tee's. */
  const _g = gear || {};
  const _wornChest = (_g.chest && _g.chest !== 'none') ? _g.chest : null;
  const _wornLegs = (_g.legs && _g.legs !== 'none') ? _g.legs : null;
  const _wornShoulders = (_g.shoulders && _g.shoulders !== 'none') ? _g.shoulders : null;
  const wantShirt = shirt && shirt !== 'none' && !_wornChest;

  /* Fire EVERY fetch concurrently.  This used to be three sequential await
     stages (body-tops -> body sprite -> traits), so on a cold load the preview
     sat blank-white for ~3 network round-trips; now it's one.  All loads are
     cached after the first draw, so later redraws/rotations are instant. */
  const [bodyTops, bodyImg, shirtImg, legsImg, chestImg, shouldersImg, hairImg, hairMeta, fhImg, fhMeta, hwImg, hwMeta, maskImg, hatRef] = await Promise.all([
    loadBodyTops(),
    loadImage(`/sprites/player/stand-${DIR}.png?v=${SPRITE_VERSION}`),
    /* v2.3.757: the LAYERED shirt sheet (white-base, tinted below) -- the
       baked torso-retint shirt is retired, so the preview composites the
       same layer the game renders. */
    wantShirt ? loadImage(`/sprites/gear/shirt/tshirt/stand-${DIR}.png?v=2.3.760`).catch(() => null) : null,
    /* v2.3.1815: in the SAME concurrent batch as everything else — a
       sequential await here would put the armour a round-trip behind the
       body, and the figure would visibly dress itself. */
    _wornLegs ? loadImage(`/sprites/gear/legs/${gearArt(_wornLegs)}/stand-${DIR}.png?v=${GEAR_ART_VER}`).catch(() => null) : null,
    _wornChest ? loadImage(`/sprites/gear/chest/${gearArt(_wornChest)}/stand-${DIR}.png?v=${GEAR_ART_VER}`).catch(() => null) : null,
    _wornShoulders ? loadImage(`/sprites/gear/shoulders/${gearArt(_wornShoulders)}/stand-${DIR}.png?v=${GEAR_ART_VER}`).catch(() => null) : null,
    wantHair ? loadTraitBest('hair', hair, DIR) : null,
    wantHair ? loadMeta('hair', hair) : null,
    wantFh ? loadTraitBest('facialhair', facialHair, DIR) : null,
    wantFh ? loadMeta('facialhair', facialHair) : null,
    wantHw ? loadTraitBest('headwear', headwear, DIR) : null,
    wantHw ? loadMeta('headwear', headwear) : null,
    /* hat's hair-clip mask (downward-filled helmet silhouette) -- present
       only for hats with clipsHair; 404 -> null -> no clipping. */
    wantHw ? loadImage(`/sprites/traits/headwear/${headwear}/hairmask/${DIR}.png?v=${TRAIT_VER}`).catch(() => null) : null,
    /* v2.3.1109: one shared recolour reference across the hat's facings so the
       preview's hat shade is identical per angle AND matches the in-game hat. */
    (wantHw && hatColor && (!SOLID_ONLY_HAT_COLOR || headwearIsSolid(headwear))) ? getHatRef(headwear).catch(() => 0) : 0,
  ]);
  const crown = (bodyTops && bodyTops[`stand-${DIR}-0`]) || [FRAME / 2, 33];

  /* ═══ v2.3.1841: the weapon + shield art, and the geometry to place them ═══
     Loaded here rather than in the Promise.all above only because both depend
     on DIR, which that block resolves.  Both degrade to null — an equip screen
     that loses its sword is better than one that throws. */
  const _wpnType = weapon && weapon.type;
  const _wpnUrl = _wpnType ? weaponArtUrl(_wpnType, weapon.gearBase, DIR) : null;
  /* The shield on the back faces OPPOSITE the way the player does, which is
     why backShieldPlacement asks for facing + PI; the same rule here. */
  const _dirIdx = ['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast'].indexOf(dir || DIR);
  const _shieldArt = shield && _dirIdx >= 0 ? getShieldArt(_dirIdx * Math.PI / 4 + Math.PI) : null;
  const [wpnImg, shieldImg] = await Promise.all([
    _wpnUrl ? loadImage(_wpnUrl).catch(() => null) : null,
    _shieldArt ? loadImage(_shieldArt.url).catch(() => null) : null,
  ]);
  /* Painted height of THIS facing's figure, so world px convert to frame px.
     crown[1] is measured (body-tops.json); the foot row is the measured
     lowest opaque row. */
  const _bodyH = Math.max(1, (FOOT_ROW[DIR] || 221) - (crown[1] || 33));
  const _w2f = _bodyH / WORLD_BODY_PX;      /* world px -> this frame's px */
  /* v2.3.1815 dev probe: which facing this canvas actually composited.  The
     equip screen pins itself to southwest, and southwest vs south is not
     reliably tellable by eye at 96px — a `dir` that silently fell back would
     look plausible in every screenshot.  Stamped on the canvas so a scenario
     reads the element it is asserting about rather than a global. */
  try { canvas.__btDir = DIR; canvas.__btMirror = !!_mirror; } catch (e) { /* ignore */ }

  ctx.clearRect(0, 0, FRAME, FRAME);
  /* Zoom the figure to fill the preview window, then shift it DOWN a touch.
     The southwest sprite sits higher in the frame (crown ~y21 vs south's
     ~y33), so a tall top-hat clipped the top -- a modest zoom (1.06) plus a
     10px downward offset gives the hat headroom while the boots still show. */
  ctx.save();
  /* Per-direction zoom tweaks so every angle reads at a consistent size:
     the southwest source frames ~10% large (shrink it + its mirror SE), and
     south / north read a touch small (bump 5%). */
  const _DIRZOOM = { southwest: 0.9, south: 1.05, north: 1.05 };
  const Z = 1.06 * (_DIRZOOM[DIR] || 1), ZCX = FRAME / 2, ZCY = 64, YOFF = 10;
  if (_mirror) { ctx.translate(FRAME, 0); ctx.scale(-1, 1); }
  ctx.translate(0, YOFF);
  ctx.translate(ZCX, ZCY);
  ctx.scale(Z, Z);
  ctx.translate(-ZCX, -ZCY);
  /* v2.3.1300: OPT-IN ground shadow (login preview passes groundShadow;
     portraitDataUrl/headshot exports don't, so they stay clean) — a soft
     3/4-squashed contact ellipse painted FIRST so every figure layer
     composites over it.  Lives inside the zoom/mirror transform, so it
     tracks the boots at every angle and flips with the mirrored views
     for free.  The per-direction foot line mirrors the v2.3.744 finding
     (SW/E source frames sit higher in their 256 box).  Alpha/squash
     follow the in-game blob-shadow recipe (entityRenderer: black
     ellipse, ry≈0.35×rx). */
  if (opts && opts.groundShadow) {
    /* v2.3.1300b: the first cut sat ~20px too HIGH, so the figure
       (composited over it) hid it almost entirely (owner: "I don't see
       any shadow... might be drawn on a layer beneath").  These foot
       lines are MEASURED — lowest opaque pixel of each stand-<dir>.png
       (south 221 / north 219 / east 223 / NE 227 / SW 234), +3px so
       the ellipse peeks around the boots; stronger/wider for the
       half-scale hero display. */
    const _FOOT_Y = { south: 224, north: 222, east: 226, northeast: 230, southwest: 237 };
    const fy = _FOOT_Y[DIR] || 226;
    const g = ctx.createRadialGradient(FRAME / 2, fy, 2, FRAME / 2, fy, 48);
    /* v2.3.1300c: ~45% darker (owner: increase intensity). */
    g.addColorStop(0, 'rgba(0,0,0,0.52)');
    g.addColorStop(0.55, 'rgba(0,0,0,0.26)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    /* squash the radial circle into the platform's 3/4 ellipse */
    ctx.translate(FRAME / 2, fy);
    ctx.scale(1, 0.34);
    ctx.translate(-FRAME / 2, -fy);
    ctx.fillStyle = g;
    ctx.fillRect(FRAME / 2 - 52, fy - 52, 104, 104);
    ctx.restore();
  }
  /* v2.3.757: the body always draws SHIRTLESS (baked shirt retired); the
     shirt is the layered white-base sheet tinted to the picked color and
     composited on top -- exactly what the game renders.  Null color = white
     tee (matches the in-game default tint). */
  /* ═══ v2.3.1841: THE SLUNG SHIELD, BEHIND THE BODY ═══
     Before the body, because the equip screen shows a toward-camera facing
     (southwest) where the shield is on his back and the body is between it
     and the viewer.  backShield.js's own displacement, converted through
     _w2f — its BACK_RX/BACK_RY/BACK_LIFT place the shield's CENTRE and are
     deliberately not scaled with the shield, so they convert as plain world
     px.  Facing away, the world draws it in FRONT; that case cannot arise
     here while the equip screen pins southwest, and if it ever does the
     shield simply sits behind him, which is the safer wrong. */
  if (shieldImg) {
    const ang = _dirIdx * Math.PI / 4;
    const sPx = 72 * _w2f;                                  /* BACK_SHIELD_PX */
    const sx = FRAME / 2 + (-Math.cos(ang) * 11) * _w2f;
    const sy = (crown[1] + _bodyH * 0.5) + ((-Math.sin(ang) * 5) - 14) * _w2f;
    ctx.save();
    ctx.translate(sx, sy);
    if (_shieldArt && _shieldArt.mirror) ctx.scale(-1, 1);
    ctx.drawImage(shieldImg, -sPx / 2, -sPx / 2, sPx, sPx);
    ctx.restore();
  }
  /* v2.3.1928: eye colour.  The portrait is where this feature actually reads
     -- the world figure is ~77px tall, so the iris is about one screen pixel
     there, and this draws at the full 256 frame.
     v2.3.1930: NO FALLBACK TO getEyeColor().  It used to end `|| getEyeColor()`,
     which was silently wrong for every portrait of SOMEONE ELSE: the inspect
     card and the friends list never passed the field, so they drew a stranger
     wearing this device's eye colour.  Nobody would have reported it as an eye
     bug -- it just made other people's faces subtly wrong.  Every caller now
     names whose eyes it means, including the creator (its own live selection),
     and an omission costs the effect rather than borrowing yours. */
  const _eyeId = (opts && opts.eyeColor) || null;
  ctx.drawImage(recolorBodyToCanvas(bodyImg, skinTarget(skin), pantsTarget(pants), shoesTarget(shoes), null, FRAME,
    eyeColorTarget(_eyeId), EYE_MASK[`stand-${DIR}`]), 0, 0);
  if (shirtImg) {
    /* v2.3.1110: restore a downscaled-on-disk shirt sheet to the 256px frame
       (these drawImage calls read a 256x256 source rect). No-op at native. */
    const shirtUp = upscaleToFrameHeight(shirtImg, FRAME);
    let layer = shirtUp;
    if (shirtColor) {
      const sc = document.createElement('canvas');
      sc.width = FRAME; sc.height = FRAME;
      const sctx = sc.getContext('2d');
      sctx.drawImage(shirtUp, 0, 0, FRAME, FRAME, 0, 0, FRAME, FRAME);
      sctx.globalCompositeOperation = 'multiply';
      sctx.fillStyle = `rgb(${shirtColor[0]},${shirtColor[1]},${shirtColor[2]})`;
      sctx.fillRect(0, 0, FRAME, FRAME);
      sctx.globalCompositeOperation = 'destination-in';
      sctx.drawImage(shirtUp, 0, 0, FRAME, FRAME, 0, 0, FRAME, FRAME);
      layer = sc;
    }
    ctx.drawImage(layer, 0, 0, FRAME, FRAME, 0, 0, FRAME, FRAME);
  }
  /* ═══ v2.3.1815: THE ARMOUR, in the renderer's own slot order ═══
     legs -> chest -> shoulders (entityRenderer's _GEAR_SLOTS, minus the
     shirt which is drawn above).  Each sheet is a STRIP and frame 0 is the
     standing pose, which is why the source rect is the same (0,0,FRAME,FRAME)
     window the shirt uses rather than the whole image.

     The metal is a MULTIPLY over the sheet's own alpha — identical in effect
     to the Pixi tint the world applies, and it has to happen here or copper
     armour renders as the steel art it borrows. */
  const _drawGearLayer = (img, item) => {
    if (!img) return;
    const up = upscaleToFrameHeight(img, FRAME);
    const rgb = materialRgb(gearMaterial(item));
    let layer = up;
    if (rgb) {
      const gc = document.createElement('canvas');
      gc.width = FRAME; gc.height = FRAME;
      const gx = gc.getContext('2d');
      gx.drawImage(up, 0, 0, FRAME, FRAME, 0, 0, FRAME, FRAME);
      gx.globalCompositeOperation = 'multiply';
      gx.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
      gx.fillRect(0, 0, FRAME, FRAME);
      /* destination-in re-applies the sheet's alpha, so the fill above is
         confined to the armour instead of flooding the frame — the same
         two-step the shirt tint uses directly above. */
      gx.globalCompositeOperation = 'destination-in';
      gx.drawImage(up, 0, 0, FRAME, FRAME, 0, 0, FRAME, FRAME);
      layer = gc;
    }
    ctx.drawImage(layer, 0, 0, FRAME, FRAME, 0, 0, FRAME, FRAME);
  };
  _drawGearLayer(legsImg, _wornLegs);
  _drawGearLayer(chestImg, _wornChest);
  _drawGearLayer(shouldersImg, _wornShoulders);
  /* ═══ v2.3.1841: THE WEAPON, IN THE HAND ═══
     After the armour so the blade reads in FRONT of the plate, which is what
     the world does on the toward-camera facings this screen uses.

     PINNED BY THE GRIP, not by a guessed offset: getWeaponHandle gives the
     handle point in the ICON's own pixels and getAnchor gives the hand in
     THIS 256 frame — the same two tables entityRenderer pins the world
     weapon with.  The icon is scaled to its world target height converted
     through _w2f, so the sword is the same size relative to the body as the
     one on screen.

     The mirrored views are already inside the ctx mirror transform (applied
     above with the zoom), so nothing extra is needed here — the hand anchor
     is asked for with the mirror flag and the whole layer flips with the
     body. */
  if (wpnImg && _wpnType) {
    const th = wpnImg.naturalHeight || wpnImg.height || 0;
    const tw = wpnImg.naturalWidth || wpnImg.width || 0;
    if (th > 0 && tw > 0) {
      const key = weapon.gearBase ? `${_wpnType}:${weapon.gearBase}` : _wpnType;
      const worldH = WORLD_WEAPON_PX[key] || WORLD_WEAPON_PX[_wpnType] || 36;
      const k = (worldH * _w2f) / th;
      /* ═══ v2.3.1842: THE METAL, not the donor art ═══
         Owner: "it should show the copper sword in the character preview
         (it's still the iron color - it was recolored to be copper for the
         first tier)."
         Every metal weapon shares ONE steel-grey sheet and the world tints it
         (entityRenderer: weaponSprite.tint = weaponTint(...)).  This canvas
         drew the sheet raw, so a copper sword came out the donor's iron.
         Same two-step the armour layers above use — multiply the metal over
         the art, then destination-in to put the sheet's own alpha back so the
         fill is confined to the blade instead of flooding the frame — and the
         material comes from weaponMaterial, the same function the renderer
         asks, so a new metal is wired up in both places at once. */
      const _wRgb = materialRgb(weaponMaterial(_wpnType, weapon.gearBase));
      let _wLayer = wpnImg;
      if (_wRgb) {
        const wc = document.createElement('canvas');
        wc.width = tw; wc.height = th;
        const wx = wc.getContext('2d');
        wx.drawImage(wpnImg, 0, 0, tw, th);
        wx.globalCompositeOperation = 'multiply';
        wx.fillStyle = `rgb(${_wRgb[0]},${_wRgb[1]},${_wRgb[2]})`;
        wx.fillRect(0, 0, tw, th);
        wx.globalCompositeOperation = 'destination-in';
        wx.drawImage(wpnImg, 0, 0, tw, th);
        _wLayer = wc;
      }
      const hand = getAnchor('stand', DIR, 0, false) || [FRAME / 2 + 14, crown[1] + _bodyH * 0.55];
      const grip = getWeaponHandle(_wpnType, weapon.gearBase, DIR) || [tw * 0.17, th * 0.12];
      ctx.save();
      ctx.translate(hand[0], hand[1]);
      /* v2.3.1786's blade-up flip, in the same terms: reflect about the grip
         so the crossguard lands just above the hand.  A rotation would mirror
         left-right too and point the tip back over the shoulder. */
      ctx.scale(1, -1);
      ctx.drawImage(_wLayer, -grip[0] * k, -grip[1] * k, tw * k, th * k);
      ctx.restore();
    }
  }
  /* Beard BELOW hair so hair strands lay over the beard (per user -- the NW
     view had the beard covering the hair). */
  if (fhImg && fhMeta) placeTrait(ctx, facialHairColor ? recolorHairToCanvas(fhImg, facialHairColor) : fhImg, fhMeta, crown, DIR);
  if (hairImg && hairMeta) {
    /* Render hair to its own canvas so it can be clipped to the hat's
       silhouette mask (same as the in-game _clipHairToHat) before
       compositing -- keeps long hair from poking out the top/sides of a
       helmet while the forehead hair under the brim still shows. */
    const hairCv = renderTraitCanvas(recolorHairToCanvas(hairImg, hairColor), hairMeta, crown, DIR);
    if (hwImg && hwMeta && hwMeta.clipsHair && maskImg) {
      const maskCv = renderTraitCanvas(maskImg, hwMeta, crown, DIR);
      const hctx = hairCv.getContext('2d');
      hctx.globalCompositeOperation = 'destination-in';
      hctx.drawImage(maskCv, 0, 0);
    }
    ctx.drawImage(hairCv, 0, 0);
  }
  /* v2.3.1493: same `solid` gate as getColoredHatTextures -- without it the
     creator preview would still show a recolored hat the game refuses to
     render, which is worse than not offering the color at all. */
  const _hwCol = hatColor && (!SOLID_ONLY_HAT_COLOR || headwearIsSolid(headwear));
  if (hwImg && hwMeta) placeTrait(ctx, _hwCol ? recolorHairToCanvas(hwImg, hatColor, hatRef) : hwImg, hwMeta, crown, DIR,
    floatLift(hwMeta, hairMeta, DIR)); /* v2.3.1561 */
  ctx.restore();
  if (canvas.__pseq !== seq) return;   /* a newer draw superseded this one */
  /* v2.3.1580: blit 1:1 -- `work` is already FRAME*S, so this adds no
     further resample.  At S=1 (every caller except the login preview) the
     canvas is still exactly 256 and this line is unchanged. */
  canvas.width = FRAME * S; canvas.height = FRAME * S;
  canvas.getContext('2d').drawImage(work, 0, 0);
}

/** v2.3.715: fire-and-forget warm of every preview angle's sprites for the
 *  current selections, so the login rotate buttons / drag-to-rotate never
 *  wait on the network.  The promise caches above make the subsequent draws
 *  hit memory; expected misses (e.g. hairmask 404s) are harmless. */
export function prewarmPortraitDirs(opts) {
  const { hair, facialHair, headwear } = opts || {};
  loadBodyTops();
  for (const DIR of ['east', 'north', 'south', 'northeast', 'southwest']) {
    loadImage(`/sprites/player/stand-${DIR}.png?v=${SPRITE_VERSION}`).catch(() => {});
    if (hair && hair !== 'none') loadTraitBest('hair', hair, DIR);
    if (facialHair && facialHair !== 'none') loadTraitBest('facialhair', facialHair, DIR);
    if (headwear && headwear !== 'none') {
      loadTraitBest('headwear', headwear, DIR);
      loadImage(`/sprites/traits/headwear/${headwear}/hairmask/${DIR}.png?v=${TRAIT_VER}`).catch(() => {});
    }
  }
}

/* Head-and-shoulders crop box (in the zoomed 256 output) for the profile
   picture -- centered on the face, tall enough to clear a top-hat. */
const HEAD_CROP = { x: 80, y: 16, s: 96 };

/** Convenience: render a portrait to a fresh canvas and return its PNG data
 *  URL.  `headshot` returns a square head-and-shoulders crop (for the
 *  top-right profile picture); otherwise the full figure.  Returns '' on
 *  failure. */
export async function portraitDataUrl(opts, headshot) {
  try {
    const cv = document.createElement('canvas');
    await drawCharacterPortrait(cv, opts);
    if (!headshot) return cv.toDataURL('image/png');
    const out = document.createElement('canvas');
    out.width = HEAD_CROP.s; out.height = HEAD_CROP.s;
    out.getContext('2d').drawImage(cv, HEAD_CROP.x, HEAD_CROP.y, HEAD_CROP.s, HEAD_CROP.s, 0, 0, HEAD_CROP.s, HEAD_CROP.s);
    return out.toDataURL('image/png');
  } catch (e) {
    return '';
  }
}
