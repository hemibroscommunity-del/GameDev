/* Player BODY recolor + selection stores (skin tone, pants, shoes).
 *
 * The player sheets bundle three recolorable regions into one body sprite:
 *   - SKIN  : warm tan pixels (face, neck, arms, bare torso)
 *   - PANTS : green pixels
 *   - SHOES : flat gray boot pixels
 * The near-black outline and eyes are left alone.
 *
 * Each region is retinted by the SAME brightness-ratio method: a pixel keeps
 * its luminance ratio vs that region's lit reference, and the chosen color is
 * applied at that ratio, so lit areas land on the color and shadows stay
 * proportionally darker (same hue, relative shading).
 *
 * Recolor runs once per (skin, pants, shoes) combo on a canvas into a texture
 * manifest mirroring playerSprites' layout, cached by combo key.  Each player
 * (local + remote) has one combo, so the cache stays tiny.  getBodyFrame()
 * falls back to the default sheets while a combo bakes or when nothing is
 * recolored.
 */

import { laterRounds } from './retryLooks.js';   /* v2.3.3882 */
import { noteMade } from '../debug/madeLog.js';   /* v2.3.4400: a first-sight bake says how long it held the page */
import { Rectangle, Texture } from 'pixi.js';
import { getFrame, SPRITE_VERSION, stripDetachedComponents, frameCount as playerFrameCount } from './playerSprites.js';   /* v2.3.3716: + frameCount, the look probe's */
import { bakeDisplayCanvas, DISPLAY_DS } from './spriteScale.js'; /* v2.3.1108: normalize downscaled sheets to the 256px frame before recolour; v2.3.1120: downscale the final DISPLAY texture for VRAM; v2.3.1237: bakeDisplayCanvas smooths nearest-upscaled sheets at DISPLAY_DS=1 (jog-shimmer fix) */
import { loadWebpOrPng, spriteUrls } from './webpImage.js'; /* v2.3.1122: prefer lossless WebP, fall back to PNG */
import { packTrimmed, sliceCropped } from './gearSheets.js';   /* v2.3.2775: the head sheets are cropped; v2.3.2791: + the body sheets */
import { releaseCanvasSource } from './releaseCanvasTexture.js';   /* v2.3.3074: a canvas-made texture let go of for good (TRAPS §139) */
import { recolorEnabled } from './traits/recolorOptions.js';
import EYE_MASK from './eyeMask.json';                      /* v2.3.1928 */
import EYE_BLANK from './eyeBlankMask.json';                /* v2.3.2643 */
import { getEyeColor, eyeColorTarget } from './traits/eyeColorCatalog.js';
import { getEyeStyle, onEyeStyleChange } from './traits/eyeStyleCatalog.js';   /* v2.3.2643 */
/* v2.3.1940: drawn pants prints + skin tattoos.  Unlike the shirt (its own
   sprite, stamped in gearSheets) these live INSIDE the body sheet, because
   that is where the pants pixels and the bare skin actually are. */
import { getArt, artHasInk, artHash, artIsSymmetric, onArtChange, sideForDir, emptyArt } from './traits/playerArt.js';   /* v2.3.2042: sideForDir/emptyArt -- a face tattoo does not revolve to the back of a head */
import { getPattern, parsePattern, patternKey, onPatternChange } from './traits/patternCatalog.js';   /* v2.3.1941 */
import { lookPaletteWanted, lookPose, getLookFrame, preloadLookSheets } from './lookPalette.js';   /* v2.3.3716: on unless `?lookpalette=0` */
import { installLookProbe } from './lookPaletteProbe.js';   /* v2.3.3716: QA, `?lookpalette=1` / `?lookprobe` only */
import { bodyWorkerWanted, bakeOnWorker, noteWorkerSheet } from './bodyBake.js';   /* v2.3.4930: the bake on a worker */
import { FRAME_W, FRAME_H, setBakeTag, bakeBodyFull, bakeHeadFull, GARMENT_SPECKS_OFF, recolorBodyToCanvas, retintSkinPixels, recolorStandInSkin, recolorStandInSkinSplit } from './bodyRecolor.js';   /* v2.3.4930: the recolour, moved verbatim (a worker runs it too) */
export { recolorBodyToCanvas, retintSkinPixels, recolorStandInSkin, recolorStandInSkinSplit };

/* ── Catalogs ── `target` = the LIT color for that choice; null = native. */
/* v2.3.1513: seven more tones at the light end (owner: "more white tan and
   white tones").  The list was bottom-heavy -- one option above the default
   tan and five below it -- so every pale character came out the same shade.
   The additions fill the light half at even steps and give it some width as
   well as height: Alabaster and Porcelain are cool, Rosy is pink-cast, Ivory
   and Fair are warm, Sand and Honey close the gap down to Tan.

   Ordered by measured luminance rather than by eye, which moved two of them:
   Honey reads lighter than Tan (168 vs 151) because Tan is the more saturated
   orange, and Ivory lighter than Pale.  Sorting on the swatch hex would have
   put both in the wrong place.  Existing ids are
   untouched and keep their exact targets, because a saved appearance stores
   the id: renaming or re-tuning one would silently change a face someone
   already picked.

   Ceiling is deliberate.  _retint scales the chosen color by each pixel's own
   luminance over SKIN_REF, and the sheets' brightest skin pixel runs k=1.10,
   so any channel above 231 clips on the highlight rim.  Only Alabaster is
   knowingly over that line -- near-white skin having a blown-out highlight is
   what near-white skin looks like -- and the rest stay at or under it so their
   shading keeps its hue.

   v2.3.2665, MEASURED CORRECTION to the paragraph above -- read it before
   trusting 231.  k=1.10 is the STAND sheets only.  Across all 82 sheets the
   brightest skin pixel is k=1.552 (jog-south-head, and jog-south/-legs,
   attack-south, fish-south, pickup-south and dodge-south all run >1.50), so a
   TRUE zero-clip ceiling is 255/1.552 = 164 -- which would forbid the entire
   light half of this list, Ivory and Pale included.  That is not a bug to fix:
   the k>1.10 pixels are 0.10% of jog-south's skin and 1.48% of hit-south's, a
   specular rim a few pixels wide, and at p99 the ceiling is ~228-245, which is
   where 231 actually comes from.  So treat 231 as the practical ceiling it is,
   and expect a light tone to clip a fraction of a percent -- Alabaster clips
   13.74% of hit-south and has shipped that way for a long time.  The number
   worth checking for a NEW light tone is its clip share against Alabaster's,
   not against zero.  Receipt: docs/TRAPS.md §95. */
export const SKIN_CATALOG = [
  { id: 'default',   name: 'Default',   swatch: '#cd864b', target: null },
  { id: 'alabaster', name: 'Alabaster', swatch: '#f9ece2', target: [249, 236, 226] },
  { id: 'porcelain', name: 'Porcelain', swatch: '#f5ddcd', target: [245, 221, 205] },
  { id: 'ivory',     name: 'Ivory',     swatch: '#f2dabc', target: [242, 218, 188] },
  /* ═══ v2.3.2665: THE SPECIES BASE TONES (alien, monkey) ═══
     Owner asked what it would take to play as an alien and a monkey, and
     supplied a reference for each.  These two rows are the COLOUR half of that
     answer and nothing more: measured off the owner's own art, not invented.
     The face and the ears -- the alien's points, the monkey's muzzle and round
     ears -- are outside the body silhouette or inside the face region, and
     neither is a recolour.  See docs/specs/SPECIES-PLAN.md for what they cost.

     Named for a COLOUR, not a species, on purpose.  A saved appearance stores
     the id (see the header note), so these ids are permanent; when the real
     species axis lands it selects a tone from this catalog rather than
     duplicating one, and a player who just likes cyan skin is not an alien.

     ALIEN CYAN is the owner reference's lit hide scaled to a 231 max channel.
     The raw measurement is (207,250,250) -- reference p90, lum 237 -- and it is
     NOT what ships, because _retint multiplies the target by each pixel's own
     luminance over SKIN_REF, so 250 * k blows out on every pixel with k > 1.02.
     `node tools/skin_clip.mjs 207,250,250` scores that raw value at 13.40% of
     all skin pixels clipped, which would make it the worst tone in this list --
     worse than Alabaster's 11.81%.  The value that ships clips 0.38%, i.e.
     within a rounding step of `fair` (0.33%) and well under ivory and rosy
     (3.28%), all three of which ship today.  Its 231 max channel is under pale
     (240), rosy (242), ivory (242), porcelain (245) and alabaster (249) too.
     Hue is identical to the reference; only the level moved.

     Do not "restore" the raw reference value: see docs/TRAPS.md §95, which
     also corrects this file's own k=1.10 / 231-ceiling claim above.  1.10 is
     the STAND sheets' brightest pixel; jog-south-head runs k=1.552. */
  { id: 'aliencyan',   name: 'Alien Cyan',   swatch: '#bfe7e7', target: [191, 231, 231], species: true },
  { id: 'rosy',      name: 'Rosy',      swatch: '#f2c9b8', target: [242, 201, 184] },
  { id: 'pale',      name: 'Pale',      swatch: '#f0cdaa', target: [240, 205, 170] },
  { id: 'fair',      name: 'Fair',      swatch: '#e6c29b', target: [230, 194, 155] },
  { id: 'sand',      name: 'Sand',      swatch: '#d9b184', target: [217, 177, 132] },
  { id: 'honey',     name: 'Honey',     swatch: '#c9a271', target: [201, 162, 113] },
  { id: 'tan',       name: 'Tan',       swatch: '#c88c50', target: [200, 140, 80] },
  { id: 'olive',     name: 'Olive',     swatch: '#b18a5e', target: [178, 138, 94] },
  { id: 'brown',     name: 'Brown',     swatch: '#9b6941', target: [155, 105, 65] },
  { id: 'deep',      name: 'Deep',      swatch: '#6e4b32', target: [112, 76, 50] },
  { id: 'ebony',     name: 'Ebony',     swatch: '#50382a', target: [82, 56, 39] },
  /* v2.3.2665: MONKEY BROWN -- the owner reference's lit fur, (85,56,23).  It
     lands at luminance 60.9, a hair under ebony's 61.8, which is why it sits
     here and not beside 'brown': measured, not placed by eye, the way the
     header note above says this list is ordered.  Nearly ebony's level but
     warmer (blue 23 vs 39), which is the whole difference between dark skin
     and dark fur.  No clipping risk at all -- max channel 85, and
     tools/skin_clip.mjs scores it at 0.000%.

     The reference's LIGHTER muzzle (measured #91765e, lum 123) is deliberately
     not here: one skin target cannot paint two tones, and the muzzle is a face-
     region layer.  docs/specs/SPECIES-PLAN.md costs it. */
  { id: 'monkeybrown', name: 'Monkey Brown', swatch: '#553817', target: [85, 56, 23], species: true },
  /* v2.3.2681: FUR COLOURS (owner: "add other colors like purple and yellow"
     for the monkey).  The one group here NOT ordered by luminance -- it is a
     palette, not a skin ramp, so it sits after the ramp as a block.  Flagged
     `species: true` like the two base tones above, so the creator's dice never
     roll a bro purple; the ids are colours, not species, for the same
     permanence reason.  The monkey's muzzle and ears stay their fixed tan on
     every one of these (owner, v2.3.2681): only the fur recolours.
     Clip share on the highlight rim, `node tools/skin_clip.mjs r,g,b`, against
     Alabaster's shipping 11.81%: snow 0.33%, yellow/pink 0.08%, orange 0.07%,
     blue 0.04%, purple 0.02%, red 0.01%, green/gray/charcoal 0. */
  { id: 'purple',   name: 'Purple',   swatch: '#7848b4', target: [120, 72, 180], species: true },
  { id: 'yellow',   name: 'Yellow',   swatch: '#d6b43c', target: [214, 180, 60],  species: true },
  { id: 'red',      name: 'Red',      swatch: '#aa322a', target: [170, 50, 42],   species: true },
  { id: 'orange',   name: 'Orange',   swatch: '#d47628', target: [212, 118, 40],  species: true },
  { id: 'green',    name: 'Green',    swatch: '#469646', target: [70, 150, 70],   species: true },
  { id: 'blue',     name: 'Blue',     swatch: '#4664c8', target: [70, 100, 200],  species: true },
  { id: 'pink',     name: 'Pink',     swatch: '#d670a8', target: [214, 112, 168], species: true },
  { id: 'gray',     name: 'Gray',     swatch: '#82828a', target: [130, 130, 138], species: true },
  { id: 'charcoal', name: 'Charcoal', swatch: '#302e32', target: [48, 46, 50],    species: true },
  { id: 'snow',     name: 'Snow',     swatch: '#e1e1e6', target: [225, 225, 230], species: true },
];

/* v2.3.2665: what the creator's dice may roll.  `species: true` tones are
   DELIBERATE picks, not variety -- a 1-in-16 roll turning a bro cyan reads as a
   broken button, which is the same objection the v2.3.1494 note raises about
   rolling a disabled recolor and the v2.3.1927 one about rolling a colour the
   hat's picker hides.  The tones stay fully available in the picker; they are
   only out of the RANDOM pool.  This flag is also what a future species axis
   reads to find its base tones, so it is not a throwaway.

   The PICKER still renders SKIN_CATALOG -- filtering there would hide them. */
export const SKIN_ROLL_CATALOG = SKIN_CATALOG.filter((c) => !c.species);

export const PANTS_CATALOG = [
  { id: 'default', name: 'Default', swatch: '#6a7a45', target: null },
  { id: 'black',   name: 'Black',   swatch: '#2c2c30', target: [46, 46, 52] },
  { id: 'gray',    name: 'Gray',    swatch: '#8a8a92', target: [140, 140, 148] },
  { id: 'white',   name: 'White',   swatch: '#e6e6ec', target: [224, 224, 230] },
  { id: 'brown',   name: 'Brown',   swatch: '#7a5230', target: [120, 80, 50] },
  { id: 'red',     name: 'Red',     swatch: '#b5402a', target: [185, 58, 46] },
  { id: 'orange',  name: 'Orange',  swatch: '#d97a1f', target: [212, 120, 42] },
  { id: 'yellow',  name: 'Yellow',  swatch: '#d9b53a', target: [216, 190, 72] },
  { id: 'green',   name: 'Green',   swatch: '#3a9a52', target: [70, 160, 84] },
  { id: 'teal',    name: 'Teal',    swatch: '#2aa9a0', target: [52, 172, 162] },
  { id: 'blue',    name: 'Blue',    swatch: '#3a5bd0', target: [72, 100, 200] },
  { id: 'navy',    name: 'Navy',    swatch: '#2a3470', target: [46, 56, 120] },
  { id: 'purple',  name: 'Purple',  swatch: '#7c4bd0', target: [126, 78, 200] },
  { id: 'pink',    name: 'Pink',    swatch: '#d05a9a', target: [214, 112, 168] },
];

export const SHOES_CATALOG = [
  { id: 'default', name: 'Default', swatch: '#5a5a5a', target: null },
  { id: 'black',   name: 'Black',   swatch: '#2a2a2e', target: [42, 42, 46] },
  { id: 'brown',   name: 'Brown',   swatch: '#7a5230', target: [116, 76, 48] },
  { id: 'tan',     name: 'Tan',     swatch: '#bfa06a', target: [190, 160, 110] },
  { id: 'white',   name: 'White',   swatch: '#e6e6ec', target: [222, 222, 228] },
  { id: 'gray',    name: 'Gray',    swatch: '#9a9a9e', target: [150, 150, 156] },
  { id: 'red',     name: 'Red',     swatch: '#b5402a', target: [182, 56, 44] },
  { id: 'blue',    name: 'Blue',    swatch: '#3a5bd0', target: [72, 98, 192] },
];

/* v2.3.1710 (owner: the cooking character "has the wrong skin color").  The
   catalog's 'default' entry carries `target: null`, which means "leave the art
   alone" — correct for the PLAYER sheets, because their skin IS this colour.
   The pre-drawn skill stand-ins are a different painting: measured, the cook's
   skin is a saturated #e88838 while the player body sheets are #cd864b.  So
   "default" has to be an explicit RGB for them, or the cook stays orange next to
   a tan avatar for every player who never touched the skin picker.  Receipt that
   this IS the art's own tan: luminance(205,134,75) = 148.6, i.e. SKIN_REF, so
   retinting a real player sheet to it is a no-op to within a rounding step. */
export const DEFAULT_SKIN_TARGET = [205, 134, 75];

function _target(catalog, id) {
  const e = catalog.find(c => c.id === id);
  return (e && e.target) || null;
}
/* v2.3.1494: every recolor funnels through these three, so gating here
   switches an option off everywhere at once -- local player, remote players,
   creator portrait -- and, crucially, for a selection ALREADY SAVED in
   localStorage.  Hiding a picker alone would leave old picks applying. */
export function skinTarget(id) { return recolorEnabled('skin') ? _target(SKIN_CATALOG, id) : null; }
export function pantsTarget(id) { return recolorEnabled('pants') ? _target(PANTS_CATALOG, id) : null; }
export function shoesTarget(id) { return recolorEnabled('shoes') ? _target(SHOES_CATALOG, id) : null; }

/* ═══ v2.3.2861: HIT, MINING AND DODGE WEAR THE WALKING SKIN ═══
   Owner: "fix the orange head during hits/mining to be whatever color the
   character color should be."  The default skin is not recoloured at all --
   skinTarget('default') is null, "the art is already this colour" -- and for
   the walking sheets that is true.  It is not for these three: they were
   painted a more orange skin.  Mean skin measured on the shipped sheets (green
   over red, the ratio that reads as orange):
       stand, jog, pickup       0.64-0.65   (the walking palette)
       hit (by facing)          0.57-0.62, one at 0.66
       mine                     0.58
       dodge                    0.56-0.57
   So a player who never opened the skin picker turned orange for every hit,
   every mining swing and every roll, and the head overlays drawn over armour
   for hit and mine did the same.  The sword and bow stand-ins had this exact
   problem and were given DEFAULT_SKIN_TARGET for the default skin in
   v2.3.1788 ("the attack stand-ins wear the WALKING skin"); this is that rule
   for the three body poses that still needed it.  A chosen skin is untouched:
   it is already recoloured from these sheets to its own target.
   (Fishing is orange too and stays so: it skips every recolour on purpose, to
   keep the rod -- see buildBodySheet.)
   The price: the default combo baked nothing before, and now bakes these eight
   sheets (five hit facings, mine, two dodge) behind the intro -- 2.3 MB,
   measured by mp-poseskin, where a chosen skin already holds 7.4 MB.
   v2.3.3146: FISHING TOO.  It takes the recolour now (getFishFrame: the owner's
   "The character's appearance changes during resource gathering activities"),
   and its sheet is the most orange of all -- (219,120,50), green over red 0.55
   -- so a player who never picked a skin cast as an orange stranger. */
const POSE_SKIN_FLOOR = Object.freeze({ hit: true, mine: true, dodge: true, fish: true });
/* Exported for the monkey's fur (speciesArt): its hit frames were painted in
   the same orange, so they take the same target or the fur would stay orange
   on a walking-skin face. */
export function poseSkinTarget(skinT, pose) {
  if (skinT || !POSE_SKIN_FLOOR[pose] || !recolorEnabled('skin')) return skinT;
  return DEFAULT_SKIN_TARGET;
}

/* ── Selection stores (localStorage) ── */
function makeStore(key, defId) {
  let active = defId;
  try { const s = typeof localStorage !== 'undefined' && localStorage.getItem(key); if (s) active = s; } catch (e) { /* ignore */ }
  const listeners = new Set();
  return {
    get: () => active,
    set: (id) => {
      if (id === active) return;
      active = id;
      try { localStorage.setItem(key, id); } catch (e) { /* ignore */ }
      listeners.forEach(fn => { try { fn(id); } catch (e) { /* ignore */ } });
    },
    on: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
  };
}
const _skinStore = makeStore('bt-skin', 'default');
const _pantsStore = makeStore('bt-pants', 'default');
const _shoesStore = makeStore('bt-shoes', 'default');

export const getSkin = _skinStore.get,  setSkin = _skinStore.set,  onSkinChange = _skinStore.on;
export const getPants = _pantsStore.get, setPants = _pantsStore.set, onPantsChange = _pantsStore.on;
export const getShoes = _shoesStore.get, setShoes = _shoesStore.set, onShoesChange = _shoesStore.on;
/* v2.3.3314: the stores' setters for QA, the trait catalogs' window.__btSet*
   seam (mp-peercolours dresses a player in another's colours mid-run, as the
   character menu would). */
if (typeof window !== 'undefined') {
  window.__btSetSkin = setSkin;
  window.__btSetPants = setPants;
  window.__btSetShoes = setShoes;
}

/* ── Recolor pipeline ── */
const SOURCE_DIRS = ['east', 'north', 'northeast', 'south', 'southwest'];
/* The three base dirs the renderer also shows FLIPPED (east->west,
   northeast->northwest, southwest->southeast).  Only matters to drawings, which
   have a handedness the shipped art does not. */
export const MIRRORED_SOURCE_DIRS = ['east', 'northeast', 'southwest'];   /* v2.3.3577: exported -- entityRenderer's masked prewarm bakes the flipped body of these too */
const POSES = ['stand', 'jog', 'hit', 'pickup', 'attack'];

/* v2.3.407: recolor LAZILY, one sheet at a time, keyed
   `${skin}/${pants}/${shoes}|${pose}/${dir}` -> [Texture] | 'loading'.  The
   old version baked all ~21 sheets up front the first time a custom-appearance
   player rendered -- a big synchronous canvas pass (each jog sheet is
   13056x256) that froze the main thread at spawn and left the 2D procedural
   fallback on screen.  Now only the (pose,dir) actually drawn gets recolored,
   on demand, so cost is spread and the freeze is gone. */
const _bodySheets = {};
/* v2.3.2083: which recoloured body sheets exist, for QA.  The animation-
   preloading law is a claim about WHEN a bake happens, and the only way to
   see when is to look before the pose is ever used -- a screenshot of a
   correctly-preloaded roll and a screenshot of one that baked a frame late
   are the same picture once the bake lands.  Keys only, read-only, and the
   game never calls it. */
/* v2.3.2148: WHICH TORSO DRAWING A FACING RESOLVES TO, exactly.
   Read-only, and the game never calls it -- the same posture as the sheet-key
   probe below. It exists because the honest question ("does facing away pick
   the back canvas?") has no other exact answer from a test: the sheet-key
   cache accumulates across a session, so filtering it by direction reads
   BAKES THAT ALREADY EXISTED rather than the current decision, and a scenario
   built on it passed identically with the swap reverted. This returns the
   decision itself. */
if (typeof window !== 'undefined') {
  window.__btArtForFacing = (dir) => {
    try {
      const a = localBodyArt(false);
      if (!a) return null;
      const r = artForFacing(a, dir);
      /* v2.3.2428: the TROUSERS join it, for exactly the reason this probe was
         written -- "does facing away pick the back canvas?" has no other exact
         answer from a test, and a mutation that made the pants keep their front
         print on a back facing passed every existing assertion. */
      return { tattoo: r ? r.tattoo : null, tattooFace: r ? r.tattooFace : null,
        pants: r ? r.pants : null };
    } catch (e) { return null; }
  };
}
if (typeof window !== 'undefined') {
  window.__btBodySheetKeys = () => Object.keys(_bodySheets)
    .filter((k) => _bodySheets[k] && _bodySheets[k] !== 'loading');
  /* v2.3.2861: the bytes one baked sheet holds (its packed canvas, before the
     GPU's mip chain) -- mp-poseskin prices the default skin's new bakes. */
  window.__btBodySheetBytes = (k) => {
    const sh = _bodySheets[k];
    const src = sh && sh !== 'loading' && sh[0] && sh[0].source;
    return src ? src.width * src.height * 4 : 0;
  };
}

/* v2.3.4930: the recolour itself (recolorBodyToCanvas, the stand-ins' bake and
   their pixel rules) is bodyRecolor.js, moved there verbatim so a worker can run it */
/* v2.3.1122: load through the WebP-preferring helper (PNG fallback).  Used by
   buildBodySheet + _buildPickupHeadSheet, both of which feed recolorBodyToCanvas
   -- the WebP is LOSSLESS so the recolour's exact-RGB classification is intact. */
function loadImg(url) { return loadWebpOrPng(url); }

/* v2.3.1305: bounded retry on body-sheet load failure (mirrors
   gearSheets.buildSheet).  The recolored body carries the SHIRT bake
   (v2.3.497) plus skin/pants/shoes — a flaked request used to cache []
   permanently, so that facing silently fell back to the base sheet for
   the whole session (shirt gone / wrong colors on one angle only: part
   of the owner's "clothes missing depending on the angle" report).
   'loading' persists across the backoff so the base-sheet fallback
   keeps the player visible; &r=N bypasses a poisoned cache entry. */
const _BODY_RETRY_MS = [2000, 6000];
/* v2.3.4930: _fileKeyMask is bodyRecolor.js fileKeyMask (moved verbatim) */
/* ═══ v2.3.3882: A BODY OR HEAD SHEET GIVEN UP ON IS ASKED FOR AGAIN, LATER ═══
   Both bakes below gave up for the visit after their bounded retries (8 s): a
   recoloured body sheet then drew the plain base sheet (the wrong skin and
   trousers in that facing), a knight's or a pickup's head sheet drew no head.
   Now each is asked for again while drawn, on the later rounds every loader
   that asks again shares (retryLooks.js, docs/specs/retry-looks.md);
   `?bodyretry=0` or `?retrylooks=0` is the game as it was. */
const _bodyLater = laterRounds('bodyretry');
const _headLater = laterRounds('bodyretry');
/* ═══ v2.3.4930: THE BAKE ON A WORKER (bodyBake.js) ═══
   The crowd tour (held-sweep.md, a-ink): another player's tattoo or trouser
   print, baked here on the page as each pose and facing first came on
   screen, 114 to 720 ms a sheet; every look's fish sheet in a shirt or under
   armour, 92 to 198 ms (b-fish).  The look palette cannot draw those (a
   drawing's ink is shaded by the body under it, an eye style's erase samples
   the face: both in the look's own colours), so the SAME bake runs on a
   worker (bodyBakeWorker.js: bakeBodyFull, the display halving, the pack)
   and the page only makes the texture from the image it hands back.  The key,
   the 'loading' mark, the plain frame meanwhile and the later rounds are as
   they were; a job the worker could not do is baked here, as before
   (_buildBodySheetPage).  `?bodyworker=0` is the page's bake for one tab. */
function buildBodySheet(sheetKey, pose, dir, skinT, pantsT, shoesT, shirtT, eyeT, art, eyeBlank, attempt = 0, round = 0) {
  if (attempt > 0 || !bodyWorkerWanted()) return _buildBodySheetPage(sheetKey, pose, dir, skinT, pantsT, shoesT, shirtT, eyeT, art, eyeBlank, attempt, round);
  const dirArt = artForFacing(art, dir);   /* v2.3.2042: the bake must match the key */
  _bodySheets[sheetKey] = 'loading';
  const bust = round > 0 ? `&g=${round}` : '';
  const fw = Math.max(1, Math.round(FRAME_W / DISPLAY_DS)), fh = Math.max(1, Math.round(FRAME_H / DISPLAY_DS));
  const job = { pose, dir, skinT, pantsT, shoesT, shirtT, eyeT, eyeRects: EYE_MASK[`${pose}-${dir}`] || null, art: dirArt, eyeBlank: eyeBlank || null };
  return bakeOnWorker('body', spriteUrls(`/sprites/player/${pose}-${dir}.png?v=${SPRITE_VERSION}${bust}`), job, fw, fh).then((r) => {
    if (_bodySheets[sheetKey] !== 'loading') { if (r) { try { URL.revokeObjectURL(r.url); } catch (e) { /* gone */ } } return; }   /* let go of meanwhile (_dropArtSheets) */
    /* the file did not load: the page's own second try after its backoff, as
       a failed first download always went on; anything else, the page's bake */
    if (r === false) return new Promise((res) => setTimeout(res, _BODY_RETRY_MS[0])).then(() => _buildBodySheetPage(sheetKey, pose, dir, skinT, pantsT, shoesT, shirtT, eyeT, art, eyeBlank, 1, round));
    if (!r) return _buildBodySheetPage(sheetKey, pose, dir, skinT, pantsT, shoesT, shirtT, eyeT, art, eyeBlank, 0, round);
    const t0 = performance.now();
    _bodySheets[sheetKey] = _sheetFromImage(r, fw, fh);
    noteWorkerSheet(`body ${pose}-${dir}`, performance.now() - t0);
  });
}
/* the frames of a sheet the worker packed, as sliceCropped cuts the page's
   (gearSheets.js): one texture of the image, a frame a cell, `orig` the whole
   frame; the image's address let go of with the texture */
function _sheetFromImage(r, fw, fh) {
  const src = Texture.from(r.img).source;
  src.scaleMode = 'linear';
  src.autoGenerateMipmaps = true;   /* v2.3.1121, as the page's bake */
  try { src.once('destroy', () => { try { URL.revokeObjectURL(r.url); } catch (e) { /* gone */ } }); } catch (e) { /* kept */ }
  const out = [];
  for (let i = 0; i < r.frames; i++) {
    let t;
    if (r.cells) {
      const c = r.cells[i];
      t = new Texture({ source: src, frame: new Rectangle(c.ax, c.ay, c.w, c.h),
        orig: new Rectangle(0, 0, fw, fh), trim: new Rectangle(c.tx, c.ty, c.w, c.h) });
    } else {
      t = new Texture({ source: src, frame: new Rectangle(i * fw, 0, fw, fh) });
    }
    t.__btIx = i;
    t.__btN = r.frames;
    out.push(t);
  }
  return out;
}
/* the page's bake, as it was (v2.3.4930: the worker's fallback, and every
   retry) */
function _buildBodySheetPage(sheetKey, pose, dir, skinT, pantsT, shoesT, shirtT, eyeT, art, eyeBlank, attempt = 0, round = 0) {
  const art0 = art;   /* v2.3.3882: as asked, for a later round */
  art = artForFacing(art, dir);   /* v2.3.2042: the bake must match the key above */
  _bodySheets[sheetKey] = 'loading';
  /* Returns an always-resolving promise so a full preload can await it. */
  const bust = (attempt > 0 ? `&r=${attempt}` : '') + (round > 0 ? `&g=${round}` : '');   /* v2.3.3882: + the later round */
  return loadImg(`/sprites/player/${pose}-${dir}.png?v=${SPRITE_VERSION}${bust}`).then(img => {
    const _madeT0 = performance.now();   /* v2.3.4400: how long this bake holds the page (debug/madeLog.js) */
    /* body poses are 256px frames; restore if stored smaller on disk.  Recolour
       runs at full 256 (exact skin/pants/shoes pixel thresholds). */
    setBakeTag(`${pose}-${dir}`);
    /* v2.3.4930: the recolour and the rod's pine are bodyRecolor.js
       bakeBodyFull, moved there verbatim with their notes: the body bake's
       worker (bodyBakeWorker.js) runs the very same steps */
    const full = bakeBodyFull(img, { pose, dir, skinT, pantsT, shoesT, shirtT, eyeT, eyeRects: EYE_MASK[`${pose}-${dir}`], art, eyeBlank });
    /* v2.3.1120: count frames at full 256-space width, then downscale the DISPLAY
       texture to 256/DISPLAY_DS px (the figure shows ~100px on a phone).  Mipmaps
       off -- renders ~1:1 post-downscale, so the mip chain is wasted VRAM. */
    const frames = Math.max(1, Math.floor(full.width / FRAME_W));
    /* ═══ v2.3.2470 QA PROBE: INK PER FRAME OF THE STRIP ═══
       The drawing is fitted and stamped ONCE PER FRAME, so a pose can be
       perfectly cached, handed out perfectly, and still blink -- the FRAMES
       differ.  No counter on a cache can see that, and four of them reported a
       clean bill while the chest was visibly pulsing.  The honest place to
       measure is the baked strip, frame by frame.
       OFF unless a scenario asks: it reads the whole sheet back out of its
       canvas, which is far too much work to do on a player's phone. */
    try {
      if (typeof window !== 'undefined' && window.__btInkProbe) {
        const _d = full.getContext('2d').getImageData(0, 0, full.width, full.height).data;
        const _per = new Array(frames).fill(0);
        for (let _i = 0; _i < _d.length; _i += 4) {
          if (_d[_i + 3] < 40) continue;
          if (!(_d[_i + 2] - _d[_i] >= 30 && _d[_i + 2] - _d[_i + 1] >= 20)) continue;
          _per[Math.min(frames - 1, Math.floor(((_i >> 2) % full.width) / FRAME_W))]++;
        }
        (window.__btSheetInk || (window.__btSheetInk = Object.create(null)))[sheetKey] =
          { frames, perFrame: _per, pose, dir };
      }
    } catch (e) { /* a probe must never break a bake */ }
    /* v2.3.1237: owner feedback — jog-shimmer at DISPLAY_DS=1: the recolour above
       ran on the exact-palette nearest upscale (required), so its output keeps
       the hard 2x stair-step edges when the sheet ships 128px on disk;
       bakeDisplayCanvas restores the anti-aliasing the DS=2 'high' downscale
       (v2.3.1121) used to give the FINAL display texture.  At DS>1 it defers to
       downscaleByFactor unchanged; native 256px sheets pass through sharp. */
    let cv = bakeDisplayCanvas(full, img.naturalHeight || img.height || 0);
    /* v2.3.1239: same jog-NE marker-scrub cleanup the base loader applies
       (playerSprites.stripDetachedComponents) -- the recolor only retints
       existing pixels, so the detached specks off the head crown survive into
       this custom-skin bake too; strip them here so a recolored player jogging
       NE/NW has no trailing outline either.  Topology-only (keep the largest
       opaque blob per frame) -> the recolored body + outline are untouched. */
    if (pose === 'jog' && dir === 'northeast') cv = stripDetachedComponents(cv, frames);
    const fw = Math.max(1, Math.round(FRAME_W / DISPLAY_DS));
    const fh = Math.max(1, Math.round(FRAME_H / DISPLAY_DS));
    /* v2.3.2791: cropped (gearSheets.sliceCropped), like the default sheets in
       playerSprites.loadSheet -- see the note there. */
    const out = sliceCropped(cv, fw, fh, frames);
    const src = out[0].source;
    src.scaleMode = 'linear';
    /* v2.3.1121: mipmaps ON -- the downscaled body still renders ~1.2x minified;
       without a mip chain the thin shoe outline crawled while JOGGING.  Cheap on
       the 4x-smaller texture. */
    src.autoGenerateMipmaps = true;
    _bodySheets[sheetKey] = out;
    noteMade(`body ${pose}-${dir}`, performance.now() - _madeT0, `body ${sheetKey}`);   /* v2.3.4400 */
  }).catch(() => {
    if (attempt < _BODY_RETRY_MS.length) {
      /* stays 'loading' during the backoff.  v2.3.4368: the retry CHAINS into
         the returned promise, as the head's has since v2.3.1398, so the
         loading screen (preloadBodyAll) waits through the backoff; it used to
         pass at the first failed download and the first use drew the plain
         base sheet, the wrong skin and trousers, for 2-8 s (sweep V18 R7-1).
         art0: the bake re-applies artForFacing itself. */
      return new Promise((res) => setTimeout(res, _BODY_RETRY_MS[attempt]))
        .then(() => buildBodySheet(sheetKey, pose, dir, skinT, pantsT, shoesT, shirtT, eyeT, art0, eyeBlank, attempt + 1, round));
    }
    _bodySheets[sheetKey] = []; /* missing -> caller falls back */
    _bodyLater.gaveUp(sheetKey, (g) => buildBodySheet(sheetKey, pose, dir, skinT, pantsT, shoesT, shirtT, eyeT, art0, eyeBlank, 0, g));   /* v2.3.3882 */
    try { if (window.__spriteLog) console.warn('[sprite] body sheet failed', sheetKey); } catch (e) { /* ignore */ }
  });
}

/** Recolored body frame for (skin, pants, shoes, pose, dir, frameIdx).  Falls
 *  back to the default sheets when nothing is recolored or while a sheet is
 *  still baking, so the player is never invisible.  Each (pose,dir) sheet is
 *  recolored lazily on first use.  Mirroring is handled by the caller. */
/* v2.3.1928: ONE place that spells the sheet key.  It grew an eye-colour
   segment and there are five prewarm sites besides getBodyFrame; a key built by
   hand in six places is a bug waiting for the sixth to be missed, and a
   prewarmed sheet under a key nobody asks for is silently wasted work. */
export function bodySheetKey(skinId, pantsId, shoesId, shirtT, shirtKey, eyeKey, pose, dir, art, eyeBlankKey) {
  art = artForFacing(art, dir);   /* v2.3.2042: see artForFacing -- key and bake must agree */
  return (skinId || 'default') + '/' + (pantsId || 'default') + '/' + (shoesId || 'default')
    + '/' + (shirtT ? (shirtKey || 'shirt') : 'none') + '/' + (eyeKey || 'none')
    /* v2.3.2643: the eye STYLE, and DELIBERATELY EMPTY when none is worn -- the
       v2.3.1940 rule for the drawings: a player who wears no style keeps the
       exact key they had before this version, so their sheets stay shared and
       prewarmed.  It has to be in the key at all because the bake differs: a
       blanked sheet handed to a player with no style would leave them with no
       eyes at all. */
    + (eyeBlankKey ? '/es:' + eyeBlankKey : '')
    + bodyArtSeg(art)
    + '|' + pose + '/' + dir;
}
/* v2.3.1940: the drawings' contribution to the key, and DELIBERATELY EMPTY when
   nothing is drawn.  Every player who has not opened the designer keeps the
   exact key they had before this version, so their sheets are shared and
   prewarmed as they always were — only someone who actually drew something pays
   for the extra bakes (including the mirrored ones, which is why `mirror` is in
   here: a pre-flipped bake must not be handed to an unflipped facing). */
/* ═══ v2.3.2042: A FACE TATTOO DOES NOT REVOLVE ROUND TO THE BACK ═══
 *
 * Owner: "face tattoos don't revolve around to your back nor do front shirt
 * designs revolve to back, they're separate."
 *
 * The SHIRT was already right: entityRenderer picks `_L.art[sideForDir(dir)]`,
 * so the front drawing shows from the front and the back drawing from behind,
 * and there are two separate canvases behind that (bt-shirtart /
 * bt-shirtart-back). The FACE was not. The stamp at the bottom of
 * recolorBodyToCanvas fires whenever a face tattoo exists, with no idea which
 * way the character is pointing -- and `north` and `northeast` are real
 * back-view sheets (playerSprites SOURCE_DIRS), so the drawing meant for a
 * face was landing on the back of a head.
 *
 * There is no "back of head" canvas to add, and there should not be: a face
 * tattoo has nowhere to go when you turn round. It simply stops being visible,
 * which is what this does.
 *
 * WHY IT LIVES INSIDE bodySheetKey AND buildBodySheet rather than at the call
 * sites. Three places pair a facing with an art object -- getBodyFrame,
 * prewarmBody and preloadBodyAll -- and the key and the bake MUST agree or the
 * preloaded sheet is filed under one name and looked up under another. That is
 * not a cosmetic slip: it is a cache miss on the first turn, i.e. a bake in
 * the middle of play, which is precisely what the animation-preload law in
 * CLAUDE.md exists to prevent. Applying the transform inside the two functions
 * that consume (dir, art) makes them agree by construction, so a fourth call
 * site added later cannot get it wrong.
 *
 * The arm tattoo deliberately stays. Arms are visible from behind, and an arm
 * drawing on a back-facing arm is the same arm. */
export function artForFacing(art, dir) {
  if (!art) return art;
  if (sideForDir(dir) !== 'back') return art;
  /* v2.3.2043: from behind, the head shows its OWN canvas rather than nothing.
     v2.3.2042 blanked the face here, which was right as far as it went -- a
     face has nowhere to go when you turn round -- but it left the back of the
     head as the one surface you could not draw on. The swap is the same one
     the shirt has been doing since v2.3.1939 (sideForDir picks front or back);
     an empty back canvas falls through to emptyArt and behaves exactly like
     v2.3.2042 did, so nobody who has not drawn one sees any change. */
  const back = art.tattooHeadBack;
  /* v2.3.2148: the BODY does the same thing the head does. Owner: "make it so
     that the back and front of the character body have separate tattoos areas".
     Until now the torso canvas was stamped whichever way the character faced,
     so a chest piece was also a back piece -- the exact complaint v2.3.2042
     fixed for the face ("face tattoos don't revolve around to your back nor do
     front shirt designs revolve to back, they're separate"), left unfixed for
     the torso.

     An undrawn back canvas falls through to emptyArt, so a player who has only
     ever drawn a chest tattoo now shows a BARE back rather than their chest
     design wrapped round them. That is the separation being asked for, and it
     is exactly how the head and the shirt already behave. The ARM canvas still
     stays put: an arm is the same arm from behind. */
  const bodyBack = art.tattooBack;
  /* v2.3.2428: the TROUSERS do it too.  Owner: "Do front and back on the pants
     and make sure they're separate."  The pants print was the last drawn
     surface still wrapping one design all the way round -- the same complaint
     v2.3.2042 fixed for the face and v2.3.2148 for the torso, left unfixed for
     the legs because nothing had asked yet.
     An undrawn back canvas falls through to emptyArt exactly as the other two
     do, so a player who has only ever drawn a front print now shows PLAIN
     trousers from behind rather than their print wrapped round -- which is the
     separation being asked for.  The trouser PATTERN is deliberately not
     touched: a pattern is a property of the garment (it tiles the whole thing),
     not a design with a front and a back. */
  const legsBack = art.pantsBack;
  return { ...art,
    tattooFace: artHasInk(back) ? back : emptyArt(),
    tattoo: artHasInk(bodyBack) ? bodyBack : emptyArt(),
    pants: artHasInk(legsBack) ? legsBack : emptyArt() };
}

export function bodyArtSeg(art) {
  if (!art) return '';
  const p = artHasInk(art.pants) ? artHash(art.pants) : '';
  const t = artHasInk(art.tattoo) ? artHash(art.tattoo) : '';
  /* v2.3.1949: two more skin canvases join the key.  Anyone who has not drawn
     one keeps the exact key they had, so existing sheets stay shared. */
  const ft = artHasInk(art.tattooFace) ? artHash(art.tattooFace) : '';
  const at = artHasInk(art.tattooArm) ? artHash(art.tattooArm) : '';
  /* v2.3.2043: the back-of-head canvas joins the key. artForFacing has already
     resolved WHICH head drawing this bake uses by the time a key is computed,
     so this only has to keep two different back drawings from sharing a sheet.
     Anyone who has not drawn one keeps the exact key they had. */
  const hb = artHasInk(art.tattooHeadBack) ? artHash(art.tattooHeadBack) : '';
  /* v2.3.2148: and the back-of-body canvas, same reasoning as `hb` above --
     artForFacing has already picked WHICH torso drawing this bake uses, so this
     only has to stop two different back drawings sharing one sheet. */
  const tb2 = artHasInk(art.tattooBack) ? artHash(art.tattooBack) : '';
  /* v2.3.2428: and the back of the trousers, same reasoning again --
     artForFacing has already chosen WHICH leg drawing this bake uses, so this
     only has to stop two different back prints sharing one sheet.  Anyone who
     has not drawn one keeps the exact key they had. */
  const pb = artHasInk(art.pantsBack) ? artHash(art.pantsBack) : '';
  /* v2.3.1941: the trouser pattern joins the same segment.  It is already a
     short string ("stripe-v:3"), so it goes in whole rather than hashed. */
  const q = parsePattern(art.pantsPattern, 'pants') ? patternKey(art.pantsPattern, 'pants') : '';
  const f = parsePattern(art.shoesPattern, 'shoes') ? patternKey(art.shoesPattern, 'shoes') : '';   /* v2.3.1944 */
  if (!p && !t && !q && !f && !ft && !at && !hb && !tb2 && !pb) return '';
  /* '#' is the marker: no catalog id contains one, so _dropArtSheets can find
     every drawn bake by substring without matching e.g. '/default/'. */
  return '/#art' + p + '.' + t + '.' + q + '.' + f + '.' + ft + '.' + at + '.' + hb + '.' + tb2
    + '.' + pb + (art.mirror ? 'm' : 'n');
}
/** The local player's own drawings, in the shape the bake wants.  `mirror` is
 *  per-facing, so callers that know the facing pass it in. */
export function localBodyArt(mirror) {
  const p = getArt('pants'), t = getArt('tattoo');
  const ft = getArt('tattooFace'), at = getArt('tattooArm');   /* v2.3.1949 */
  const hb = getArt('tattooHeadBack');   /* v2.3.2043 */
  const tbk = getArt('tattooBack');       /* v2.3.2148 */
  const pbk = getArt('pantsBack');        /* v2.3.2428 */
  const q = getPattern('pants'), f = getPattern('shoes');   /* v2.3.1944 */
  if (!artHasInk(p) && !artHasInk(t) && !artHasInk(ft) && !artHasInk(at) && !artHasInk(hb)
    && !artHasInk(tbk) && !artHasInk(pbk)
    && !parsePattern(q, 'pants') && !parsePattern(f, 'shoes')) return null;
  return { pants: p, pantsBack: pbk, tattoo: t, tattooFace: ft, tattooArm: at, tattooHeadBack: hb,
    tattooBack: tbk,
    pantsPattern: q, shoesPattern: f, mirror: !!mirror };
}
/** The eye target for a sheet, or null when that sheet has no eyes in it.
 *  `eyeId` is always passed in -- see getBodyFrame. */
function eyeFor(pose, dir, eyeId) {
  if (!eyeId || !EYE_MASK[`${pose}-${dir}`]) return null;
  const t = eyeColorTarget(eyeId);
  return t ? { id: eyeId, t } : null;
}
/** v2.3.2643: the whole-eye boxes to ERASE on a sheet, or null.
 *
 *  Its twin above, and passed in for the same v2.3.1930 reason: this bakes
 *  REMOTE players too, so reading the style from the local store would put your
 *  eyes on a stranger's face.  Sheets the table does not name -- the mine, fish
 *  and hit faces, which are drawn squinting and have no white in them -- return
 *  null and bake unchanged, which is the same set the eye COLOUR already skips
 *  and for the same reason: there is no eye there to erase. */
function eyeBlankFor(pose, dir, eyeStyleId) {
  return eyeBlankForSheet(`${pose}-${dir}`, eyeStyleId);
}
/** The same answer, asked by SHEET NAME.  The head overlays are `jog-south-head`
 *  rather than a (pose, dir) pair, and the blank table is keyed by sheet, so
 *  they ask directly instead of the caller inventing a fake direction. */
function eyeBlankForSheet(sheet, eyeStyleId) {
  if (!eyeStyleId || eyeStyleId === 'none') return null;
  const rects = EYE_BLANK[sheet];
  return rects ? { id: eyeStyleId, rects } : null;
}

/* v2.3.1930: `eyeId` IS AN ARGUMENT, and v2.3.1928 was wrong to make it a
   store read.  That version reasoned that every caller would otherwise have to
   learn about eye colour and they all draw the same character -- which was true
   only while the colour could not travel between players.  The moment it does,
   "the same character" is false: this function draws REMOTE players too, from
   their own skin/pants/shoes, and a store read would have painted every one of
   them with THIS device's eyes.
   Undefined means no eye recolour, deliberately, rather than defaulting to the
   local player: a call site that has not been updated then loses the effect,
   which is invisible, instead of putting your eyes on a stranger's face, which
   is a bug someone would have to reproduce to understand. */
export function getBodyFrame(skinId, pantsId, shoesId, pose, dir, frameIdx, shirtT, shirtKey, eyeId, art, eyeStyleId) {
  const skinT = poseSkinTarget(skinTarget(skinId), pose), pantsT = pantsTarget(pantsId), shoesT = shoesTarget(shoesId);   /* v2.3.2861: poseSkinTarget */
  const eye = eyeFor(pose, dir, eyeId);
  /* v2.3.2643: LAST in the list, so the two dev harnesses that call this
     positionally with eight arguments are untouched, and PASSED IN for the
     v2.3.1930 reason the paragraph above gives for `eyeId`. */
  const blank = eyeBlankFor(pose, dir, eyeStyleId);
  /* v2.3.1940: `art` is the ninth thing that can make this player's body differ
     from the shipped sheet, and like the rest of them it is PASSED IN, not read
     from a store — this function draws remote players too (v2.3.1930). */
  /* v2.3.2042: resolve the facing BEFORE the gate, so a player whose only
     drawing is a face tattoo falls back to the shipped sheet when facing
     away rather than baking a copy identical to it. */
  const _dirArt = artForFacing(art, dir);
  const _art = bodyArtSeg(_dirArt) ? _dirArt : null;
  if (!skinT && !pantsT && !shoesT && !shirtT && !eye && !_art && !blank) return getFrame(pose, dir, frameIdx);
  const sheetKey = bodySheetKey(skinId, pantsId, shoesId, shirtT, shirtKey, eye && eye.id, pose, dir, _art, blank && blank.id);
  const entry = _bodySheets[sheetKey];
  if (entry === undefined) { const _bp = buildBodySheet(sheetKey, pose, dir, skinT, pantsT, shoesT, shirtT, eye && eye.t, _art, blank && blank.rects); if (_buildSink) _buildSink.push(_bp); return getFrame(pose, dir, frameIdx); }
  if (entry === 'loading' || !entry.length) { if (entry !== 'loading') _bodyLater.due(sheetKey); return getFrame(pose, dir, frameIdx); }   /* v2.3.3882 */
  return entry[((frameIdx % entry.length) + entry.length) % entry.length];
}

/* v2.3.4930: QA (mp-bodyworker) -- the same body sheets baked on the page
   (bakeBodyFull, the display halving, packTrimmed: buildBodySheet's steps)
   and on the worker, compared byte by byte.  `looks`: [{ skin, pants, shoes,
   pose, dir, eyeColor, eyeStyle, art }] as getBodyFrame takes them (art: the
   drawings object).  Never called by the game. */
if (typeof window !== 'undefined') {
  window.__btBodyWorkerCompare = async (looks) => {
    const out = [];
    for (const L of looks) {
      const pose = L.pose, dir = L.dir;
      const skinT = poseSkinTarget(skinTarget(L.skin), pose), pantsT = pantsTarget(L.pants), shoesT = shoesTarget(L.shoes);
      const eye = eyeFor(pose, dir, L.eyeColor);
      const blank = eyeBlankFor(pose, dir, L.eyeStyle);
      const a0 = pose === 'fish' ? _fishArt(L.art) : L.art;
      const da = artForFacing(a0, dir);
      const art = bodyArtSeg(da) ? da : null;
      const job = { pose, dir, skinT, pantsT, shoesT, shirtT: null, eyeT: eye && eye.t, eyeRects: EYE_MASK[`${pose}-${dir}`] || null, art, eyeBlank: blank && blank.rects };
      const fw = Math.max(1, Math.round(FRAME_W / DISPLAY_DS)), fh = Math.max(1, Math.round(FRAME_H / DISPLAY_DS));
      const url = `/sprites/player/${pose}-${dir}.png?v=${SPRITE_VERSION}`;
      const t0 = performance.now();
      const img = await loadImg(url);
      const full = bakeBodyFull(img, job);
      const frames = Math.max(1, Math.floor(full.width / FRAME_W));
      let cv = bakeDisplayCanvas(full, img.naturalHeight || img.height || 0);
      if (pose === 'jog' && dir === 'northeast') cv = stripDetachedComponents(cv, frames);
      const packed = packTrimmed(cv, fw, fh, frames);
      const pc = packed ? packed.canvas : cv;
      const page = pc.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, pc.width, pc.height).data;
      const pageMs = performance.now() - t0;
      const w = await window.__btBodyWorkerBytes(spriteUrls(url), job, fw, fh);
      let diff = 0, worst = 0;
      if (w && w.raw && w.W === pc.width && w.H === pc.height) {
        for (let i = 0; i < page.length; i++) {
          const d = Math.abs(page[i] - w.raw[i]);
          if (d) { diff++; if (d > worst) worst = d; }
        }
      }
      out.push({ pose, dir, look: L.name || '', W: pc.width, H: pc.height, wW: w && w.W, wH: w && w.H,
        cellsSame: JSON.stringify(packed ? packed.cells : null) === JSON.stringify(w && w.cells), frames, wFrames: w && w.frames,
        diff, worst, pageMs: Math.round(pageMs), workerMs: Math.round((w && w.ms) || 0), wt: w && w.t, why: w && w.why, ink: !!art, blank: !!blank });
    }
    return out;
  };
}

/* v2.3.4930: QA (mp-bodyworker) -- a peer's stand-in strip baked as
   effectsRenderer.js _remoteBodyFramesFor / _remoteSheetFramesFor bake it
   (recolorBodyToCanvas, then _sliceStandIn's packTrimmed) and on the worker,
   byte by byte.  `strips`: [{ url (the file as loaded), fw, fh (null: square,
   off the art), skin, pants, shoes, art, mirror, dir, torso }]. */
if (typeof window !== 'undefined') {
  window.__btStandInWorkerCompare = async (strips) => {
    const out = [];
    for (const S of strips) {
      const img = await loadImg(S.url);
      const sq = (S.fw == null || S.fh == null) ? (img.naturalHeight || img.height || 0) : 0;
      const fw = sq || S.fw, fh = sq || S.fh;
      const da = S.art ? artForFacing({ ...S.art, mirror: !!S.mirror }, S.dir) : null;
      const art = bodyArtSeg(da) ? da : null;
      const job = { skinT: skinTarget(S.skin) || DEFAULT_SKIN_TARGET, pantsT: pantsTarget(S.pants), shoesT: shoesTarget(S.shoes), fh, fw, art, legsUnder: null, torso: !!S.torso };
      const t0 = performance.now();
      const cv = recolorBodyToCanvas(img, job.skinT, job.pantsT, job.shoesT, null, fh, null, null, art, fw, undefined, undefined, undefined, undefined, !!S.torso);
      const n = Math.max(1, Math.round(cv.width / fw));
      const packed = packTrimmed(cv, fw, fh, n);
      const pc = packed ? packed.canvas : cv;
      const page = pc.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, pc.width, pc.height).data;
      const pageMs = performance.now() - t0;
      const w = await window.__btBodyWorkerBytes([img.src], job, fw, fh, 'standin');
      let diff = 0, worst = 0;
      if (w && w.raw && w.W === pc.width && w.H === pc.height) {
        for (let i = 0; i < page.length; i++) {
          const d = Math.abs(page[i] - w.raw[i]);
          if (d) { diff++; if (d > worst) worst = d; }
        }
      }
      out.push({ url: S.url, look: S.name || '', W: pc.width, H: pc.height, wW: w && w.W, wH: w && w.H,
        cellsSame: JSON.stringify(packed ? packed.cells : null) === JSON.stringify(w && w.cells), frames: n, wFrames: w && w.frames,
        diff, worst, pageMs: Math.round(pageMs), workerMs: Math.round((w && w.ms) || 0), why: w && w.why, ink: !!art });
    }
    return out;
  };
}

/* ═══ v2.3.3716: THE STAND AND JOG FRAMES FROM THE NUMBERS (on; `?lookpalette=0` off) ═══
   The same look getBodyFrame bakes a copy of, drawn instead from one shared
   sheet of colour numbers and a row of this look's colours (lookPalette.js;
   docs/specs/look-palette.md).  Null whenever the old path is the one that
   draws it: the switch off, a pose without numbers, the art's own look (the
   shipped sheet, as getBodyFrame gives it), or anything the numbers do not
   carry yet -- a baked shirt, a drawing, an eye style (its erase samples the
   face round each eye), no atlas row free.  The caller then asks getBodyFrame,
   exactly as before.  Only for a body drawn as it is: a frame that is masked
   under armour or cut into bands reads its pixels, and those are numbers. */
/* ═══ v2.3.4400: BAKES ASKED FOR AHEAD, AND WAITED FOR ═══
   getBodyFrame bakes a look's sheet the first time it is asked for and hands
   back the plain frame meanwhile: right for a stranger walking up, a frozen
   frame for the townsfolk, whose poses are known before the world opens
   (game/townsfolkWalk.js folkDayPoses).  awaitBodyBuilds(fn) runs `fn`,
   which asks for the frames exactly as the renderer will, and resolves when
   every bake that started has landed. */
let _buildSink = null;
export function awaitBodyBuilds(fn) {
  const sink = [];
  _buildSink = sink;
  try { fn(); } finally { _buildSink = null; }
  return Promise.all(sink).then(() => sink.length, () => sink.length);
}
/** Do the shared colour numbers refuse this look in this pose and direction
 *  (getLookBodyFrame's own two refusals), so the old path would bake it? */
export function lookBodyRefused(pose, dir, art, eyeStyleId) {
  if (pose === 'fish') return false;   /* no eye style or mirrored drawing on that sheet (getLookBodyFrame) */
  return !!eyeBlankFor(pose, dir, eyeStyleId) || !!bodyArtSeg(artForFacing(art, dir));
}
export function getLookBodyFrame(skinId, pantsId, shoesId, pose, dir, frameIdx, shirtT, eyeId, art, eyeStyleId) {
  /* v2.3.3750: every pose the body's manifest has (lookPose).  Fishing asks
     as getFishFrame does: no shirt, eye or eye style on that sheet, its
     drawings unmirrored */
  if (pose === 'fish') { shirtT = null; eyeId = undefined; eyeStyleId = undefined; art = _fishArt(art); }
  if (!lookPaletteWanted() || !lookPose(pose) || shirtT) return null;
  if (eyeBlankFor(pose, dir, eyeStyleId)) return null;
  if (bodyArtSeg(artForFacing(art, dir))) return null;
  const eye = eyeFor(pose, dir, eyeId);
  return getLookFrame(pose, dir, frameIdx, poseSkinTarget(skinTarget(skinId), pose), pantsTarget(pantsId),
    shoesTarget(shoesId), eye ? eye.t : null);
}

/* v2.3.3752: the same look as getLookBodyFrame's, as the row entries the
   armoured body is coloured with (lookArmour.js) -- the art's own look
   included (all null), which the bare body draws from its shipped sheet but
   whose masked frames under armour were copies like any other look's.  Null
   where getLookBodyFrame would be for any other reason: the old path. */
export function getLookBodyEntries(skinId, pantsId, shoesId, pose, dir, shirtT, eyeId, art, eyeStyleId) {
  if (!lookPaletteWanted() || !lookPose(pose) || shirtT) return null;
  if (eyeBlankFor(pose, dir, eyeStyleId)) return null;
  if (bodyArtSeg(artForFacing(art, dir))) return null;
  const eye = eyeFor(pose, dir, eyeId);
  return [[1, poseSkinTarget(skinTarget(skinId), pose)], [2, pantsTarget(pantsId)], [3, shoesTarget(shoesId)], [4, eye ? eye.t : null]];
}

/* ═══ v2.3.2854: FISHING KEEPS YOUR DRAWINGS ═══
   Owner: "yes make tattoos stay on while harvesting resources."
   Fishing draws the RAW fish sheet, on purpose (entityRenderer v2.3.2304):
   the pink rod and line are baked into that art and the body-region RECOLOUR
   mis-paints them, so no skin tone, trousers, shoes or eyes go on it.  The
   drawings rode that same bake and were lost with it -- which nobody chose.
   They do not need the recolour.  In the file the rod is the magenta tool key,
   and _isSkin refuses it (skin wants g >= b; the key is b > g), so a bake with
   NO retint targets and only `art` stamps the tattoos, prints and patterns into
   the regions they always use and leaves every other pixel as drawn, the rod
   included -- and buildBodySheet turns the key to pine AFTER the stamp
   (v2.3.2761), so the rod is pine here as on the plain sheet.  A player with
   no drawings gets the raw frame, exactly as before.
   South only and never mirrored: the fish art is authored south and never
   flips, so the drawing is always the unflipped one. */
function _fishArt(art) {
  return art && art.mirror ? { ...art, mirror: false } : art;
}
/* ═══ v2.3.3146: ...AND YOUR SKIN, TROUSERS AND BOOTS ═══
   The owner: "The character's appearance changes during resource gathering
   activities.  It needs to stay consistent."  Fishing was the plainest case of
   it: a deep-skinned bro in red trousers cast as the sheet's own orange man in
   olive -- for as long as he fished, on every screen.  The rod was never in
   danger from the skin and trouser tests (the paragraph above: the key is
   b > g, which neither accepts); what the recolour WOULD have mis-painted was
   the LINE, which is boot-grey, and recolorBodyToCanvas's `bootsUnderLegs`
   (asked for by buildBodySheet for this pose) keeps the boots to where the
   boots are.  The default skin is the walking tan here (POSE_SKIN_FLOOR), as
   for a hit, a mining swing and a roll.  `skinId`, `pantsId`, `shoesId`: the
   fisher's own -- yours, or a peer's off the wire. */
export function getFishFrame(art, frameIdx, skinId, pantsId, shoesId) {
  return getBodyFrame(skinId || null, pantsId || null, shoesId || null, 'fish', 'south', frameIdx, null, 'none', undefined, _fishArt(art), undefined);
}
/** Bake the fish sheet NOW, so a cast shows your look from its first frame
 *  instead of the painted one until a lazy bake lands (animation-preload law,
 *  CLAUDE.md).  v2.3.3146: with your skin, trousers and boots -- so for every
 *  player, as the default skin is recoloured to the walking tan here
 *  (POSE_SKIN_FLOOR) -- and the drawings as before (it was prewarmFishInk, for
 *  a drawn player only).  Resolves at once when it is already baked or baking.
 *  Same key getFishFrame asks for. */
let _fishFollows = false;   /* set by preloadBodyAll: see prewarmBody */
export function prewarmFish(art, skinId, pantsId, shoesId) {
  const dirArt = artForFacing(_fishArt(art), 'south');
  const a = dirArt && bodyArtSeg(dirArt) ? dirArt : null;
  const skinT = poseSkinTarget(skinTarget(skinId), 'fish'), pantsT = pantsTarget(pantsId), shoesT = shoesTarget(shoesId);
  if (!skinT && !pantsT && !shoesT && !a) return Promise.resolve();
  const key = bodySheetKey(skinId, pantsId, shoesId, null, 'none', null, 'fish', 'south', a, null);
  if (_bodySheets[key] !== undefined) return Promise.resolve();
  return buildBodySheet(key, 'fish', 'south', skinT, pantsT, shoesT, null, null, a, null);
}

/* v2.3.1116: loot-pickup HEAD overlay, RECOLORED.  pickup-<dir>-head.png holds
   the head pixels per frame (transparent elsewhere); entityRenderer draws it
   ABOVE the gear so an armoured player's deep-crouch head isn't clipped to a
   sliver.  It used to be loaded RAW and drawn untinted, so the head/face always
   showed the DEFAULT tan skin while the recolored body below wore the chosen
   skin -- the head "reverted" to default on every pickup, for armoured AND
   bare players.  Recolor it through the SAME pipeline as the body so the head
   matches exactly.  The sheet ships full-res 256px, so recolorBodyToCanvas's
   upscale is a no-op; only skin (and any pants/shoes) pixels exist in the head
   region, so the body's skin retint lands and nothing else shifts.  Cached per
   (skin/pants/shoes) combo + (pose,dir) so local and remote players -- who may
   wear different skins -- don't collide.  The default combo recolors to an
   unchanged copy (every _retint is gated on a non-null target), matching the
   old raw behaviour. */
const _pickupHeadSheets = {};   // 'skin/pants/shoes|pose-dir' -> [Texture] | 'loading' | []
/* v2.3.1117: head overlay is downscaled HEAD_DS x before it becomes a texture.
   It only ever renders at the small pickup-pose scale, so a full 7424x256 source
   (~7.6MB GPU + mipmaps) was wildly oversized -- a big contributor to iPhone
   Safari losing the WebGL context after several armoured pickups.  At /2 it is
   ~1.9MB, and the caller (entityRenderer._placePickupHead) reads the frame size
   back off the texture and scales up to match the 256px body, so alignment is
   automatic and HEAD_DS can change here without touching the renderer.  Recolor
   still runs at full 256px (recolorBodyToCanvas upscales for stable pixel
   thresholds); only the FINAL display texture is shrunk. */
const HEAD_DS = 2;
function _pickupHeadCap() {
  /* Bound the cache: a player who changes skin/pants/shoes mid-session would
     otherwise accumulate one head sheet per combo forever.  Evict the oldest
     (insertion order) baked entry; destroy its source on a 30s delay so an
     in-use texture is never killed mid-frame (same guard as _maskedBodyCache). */
  const keys = Object.keys(_pickupHeadSheets);
  if (keys.length <= 32) return; /* v2.3.1382: 12 -> 20 — jog heads are 5/combo, and
     town scenes with a few armored remotes crossed 12 quickly.
     v2.3.1479: 20 -> 32 — the local combo alone now holds 11 (4 jog + 5 hit +
     pickup + mine), so 20 left too little headroom before remotes started
     evicting.  The local-combo guard below already protects the player's own
     sheets; this keeps a few remotes from thrashing each other. */
  /* v2.3.1382 (owner: "head fully missing on north jog"): NEVER evict the
     LOCAL player's current combo — those are the oldest entries (preloaded
     at the loading screen), so the old oldest-first rule destroyed exactly
     the sheets on screen; the head then vanished until a rebuild+re-evict
     thrash cycle. */
  /* v2.3.4368: through _headComboPrefix, the builder _headSheetKey uses, so
     the guard and the key cannot be spelt two ways again.  v2.3.3658 took the
     trousers and boots out of the key but this line still spelt them in, so it
     guarded only a player in default trousers AND default boots (1 roll in 112)
     and everyone else's own heads were thrown out in a busy scene (the
     state-machine sweep, V18 R7-2; docs/specs/garment-specks.md). */
  const _localPrefix = _headComboPrefix(_skinStore.get(), _pantsStore.get(), _shoesStore.get());
  for (const k of keys) {
    /* v2.3.2862: '|' OR '/es:' after the combo -- an eye style (v2.3.2643)
       puts its segment there, and the old '|'-only prefix left a styled
       player's own heads first in line for eviction. */
    if (k.startsWith(_localPrefix + '|') || k.startsWith(_localPrefix + '/es:')) continue;
    const e = _pickupHeadSheets[k];
    if (!Array.isArray(e) || !e.length) continue;   // skip 'loading'/empty
    delete _pickupHeadSheets[k];
    const src = e[0] && e[0].source;
    if (src) setTimeout(() => { try { releaseCanvasSource(src); } catch (err) { /* ignore */ } }, 30000);   /* v2.3.3074: Cache entry and canvas too (TRAPS §139) */
    break;
  }
}
/* v2.3.2775: QA probe -- what cropping the head sheets saved, per sheet key */
const _headTrimStats = Object.create(null);
const _headTrimFrames = Object.create(null);
if (typeof window !== 'undefined') {
  window.__btHeadTrim = () => ({ ..._headTrimStats });
  window.__btHeadFrames = (key) => _headTrimFrames[key] || null;
}
/* ═══ v2.3.2862: THE FACE TATTOO RIDES THE HEAD OVERLAYS ═══
 * These sheets are drawn OVER your head -- on every loot pickup, and while
 * mining, taking a hit or jogging in the full steel set -- and they were baked
 * with no drawings at all, so a face tattoo vanished for exactly as long as one
 * was up.  `art` is the facing-resolved drawings (artForFacing, as the body
 * takes them); only the face canvas has anywhere to go on a head.  The key
 * carries it (_headSheetKey), so a drawing edit is a different sheet. */
function _headArtSeg(a) {
  if (!a || !artHasInk(a.tattooFace)) return '';
  /* '#' is _dropArtSheets' marker.  The mirror flag only where it changes the
     stamp: a symmetric drawing shares one sheet between the two sides. */
  return '#hf' + artHash(a.tattooFace) + ((a.mirror && !artIsSymmetric(a.tattooFace)) ? 'm' : '');
}
/* v2.3.4368: the combo part of a head sheet's key, on its own so the cap's
   "never evict your own heads" guard (_pickupHeadCap) builds its prefix with
   the very same words as the key */
function _headComboPrefix(skinId, pantsId, shoesId) {
  /* v2.3.3658: a head sheet takes no trousers or boots now (_buildPickupHeadSheet),
     so one sheet serves every pair of them -- keyed by them, every pair baked
     the same head again and the 32-sheet cap evicted ones in use (found in
     review) */
  if (!GARMENT_SPECKS_OFF) { pantsId = null; shoesId = null; }
  return (skinId || 'default') + '/' + (pantsId || 'default') + '/' + (shoesId || 'default');
}
function _headSheetKey(skinId, pantsId, shoesId, pose, dir, blank, a) {
  return _headComboPrefix(skinId, pantsId, shoesId)
    + (blank ? '/es:' + blank.id : '') + '|' + pose + '-' + dir + _headArtSeg(a);
}
/* v2.3.4930: the face drawing's stamp is bodyRecolor.js stampHeadInk (moved
   verbatim, with the head's bake steps: bakeHeadFull) */
/* ═══ v2.3.4930: ...AND ON THE WORKER (bodyBake.js) ═══
   The head an armoured player shows is recoloured per look like the body
   (28 to 164 ms a sheet on the page as an armoured player circled you:
   held-sweep.md, `body-bake`), so in play it is baked by the same worker:
   bodyRecolor.js bakeHeadFull and the same pack.  As buildBodySheet's: the
   key, the 'loading' mark, the retries and the later rounds are as they were,
   and a job the worker could not do is baked here (_buildPickupHeadSheetPage). */
function _buildPickupHeadSheet(key, pose, dir, skinT, pantsT, shoesT, eyeBlank, art = null, attempt = 0, round = 0) {
  if (attempt > 0 || !bodyWorkerWanted()) return _buildPickupHeadSheetPage(key, pose, dir, skinT, pantsT, shoesT, eyeBlank, art, attempt, round);
  _pickupHeadSheets[key] = 'loading';
  const bust = round > 0 ? `&g=${round}` : '';
  const fw = Math.max(1, Math.round(FRAME_W / HEAD_DS)), fh = Math.max(1, Math.round(FRAME_H / HEAD_DS));
  const job = { pose, skinT, pantsT: GARMENT_SPECKS_OFF ? pantsT : null, shoesT: GARMENT_SPECKS_OFF ? shoesT : null, eyeBlank: eyeBlank || null, art, ds: HEAD_DS };
  return bakeOnWorker('head', spriteUrls(`/sprites/player/${pose}-${dir}-head.png?v=${SPRITE_VERSION}${bust}`), job, fw, fh).then((r) => {
    if (_pickupHeadSheets[key] !== 'loading') { if (r) { try { URL.revokeObjectURL(r.url); } catch (e) { /* gone */ } } return; }   /* let go of meanwhile */
    /* a facing that ships no head sheet (by design) or a failed download: the
       page's own second try after its backoff, as before */
    if (r === false) return new Promise((res) => setTimeout(res, 2000)).then(() => _buildPickupHeadSheetPage(key, pose, dir, skinT, pantsT, shoesT, eyeBlank, art, 1, round));
    if (!r) return _buildPickupHeadSheetPage(key, pose, dir, skinT, pantsT, shoesT, eyeBlank, art, 0, round);
    const t0 = performance.now();
    const src = Texture.from(r.img).source;
    src.scaleMode = 'linear';
    src.autoGenerateMipmaps = false;    // as the page's: a single render scale
    try { src.once('destroy', () => { try { URL.revokeObjectURL(r.url); } catch (e) { /* gone */ } }); } catch (e) { /* kept */ }
    const out = [];
    for (let i = 0; i < r.frames; i++) {
      if (r.cells) {
        const c = r.cells[i];
        out.push(new Texture({ source: src, frame: new Rectangle(c.ax, c.ay, c.w, c.h),
          orig: new Rectangle(0, 0, fw, fh), trim: new Rectangle(c.tx, c.ty, c.w, c.h) }));
      } else {
        out.push(new Texture({ source: src, frame: new Rectangle(i * fw, 0, fw, fh) }));
      }
    }
    if (r.cells) _headTrimStats[key] = { fullBytes: r.frames * fw * fh * 4, packedBytes: r.W * r.H * 4 };
    _pickupHeadSheets[key] = out;
    _pickupHeadCap();
    noteWorkerSheet(`head ${pose}-${dir}`, performance.now() - t0);
  });
}
/* v2.3.4930: QA (mp-bodyworker) -- the same head sheets baked on the page
   (bakeHeadFull, packTrimmed: _buildPickupHeadSheetPage's steps) and on the
   worker, compared byte by byte.  `looks`: [{ skin, pose, dir, eyeStyle,
   art }].  Never called by the game. */
if (typeof window !== 'undefined') {
  window.__btHeadWorkerCompare = async (looks) => {
    const out = [];
    for (const L of looks) {
      const pose = L.pose, dir = L.dir;
      const skinT = poseSkinTarget(skinTarget(L.skin), pose);
      const blank = eyeBlankForSheet(`${pose}-${dir}-head`, L.eyeStyle);
      const a = L.art ? artForFacing(L.art, dir) : null;
      const job = { pose, skinT, pantsT: null, shoesT: null, eyeBlank: blank && blank.rects, art: a, ds: HEAD_DS };
      const fw = Math.max(1, Math.round(FRAME_W / HEAD_DS)), fh = Math.max(1, Math.round(FRAME_H / HEAD_DS));
      const url = `/sprites/player/${pose}-${dir}-head.png?v=${SPRITE_VERSION}`;
      const t0 = performance.now();
      const img = await loadImg(url);
      const cv = bakeHeadFull(img, job);
      const frames = Math.max(1, Math.floor(cv.width / fw));
      const packed = packTrimmed(cv, fw, fh, frames);
      const pc = packed ? packed.canvas : cv;
      const page = pc.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, pc.width, pc.height).data;
      const pageMs = performance.now() - t0;
      const w = await window.__btBodyWorkerBytes(spriteUrls(url), job, fw, fh, 'head');
      let diff = 0, worst = 0;
      if (w && w.raw && w.W === pc.width && w.H === pc.height) {
        for (let i = 0; i < page.length; i++) {
          const d = Math.abs(page[i] - w.raw[i]);
          if (d) { diff++; if (d > worst) worst = d; }
        }
      }
      out.push({ pose, dir, look: L.name || '', W: pc.width, H: pc.height, wW: w && w.W, wH: w && w.H,
        cellsSame: JSON.stringify(packed ? packed.cells : null) === JSON.stringify(w && w.cells), frames, wFrames: w && w.frames,
        diff, worst, pageMs: Math.round(pageMs), workerMs: Math.round((w && w.ms) || 0), why: w && w.why,
        ink: !!(a && artHasInk(a.tattooFace)), blank: !!blank });
    }
    return out;
  };
}
/* the page's bake, as it was (v2.3.4930: the worker's fallback, and every
   retry) */
function _buildPickupHeadSheetPage(key, pose, dir, skinT, pantsT, shoesT, eyeBlank, art = null, attempt = 0, round = 0) {
  _pickupHeadSheets[key] = 'loading';
  /* v2.3.1381: bounded retry (v2.3.1305 pattern) — a flaked head-sheet
     fetch used to cache [] permanently, leaving the fullset knight
     headless for that dir all session.  Missing dirs still settle to []
     after the retries (pickup ships south-only by design). */
  const _bust = (attempt > 0 ? `&r=${attempt}` : '') + (round > 0 ? `&g=${round}` : '');   /* v2.3.3882: + the later round */
  return loadImg(`/sprites/player/${pose}-${dir}-head.png?v=${SPRITE_VERSION}${_bust}`).then(img => {
    /* v2.3.2643: the head overlay is a FACE, so it carries the eyes too -- and
       it is the face an ARMOURED player actually shows while jogging, because
       the fullset figure draws its head from here rather than from the body
       sheet.  Missing it would have left the erase working everywhere except
       on a knight, which is the v2.3.1788 shape of omission exactly. */
    /* v2.3.3658: and NO GARMENTS.  A head sheet's frames hold the head
       alone, so every trouser- or boot-coloured pixel in them is the
       outline's (up to 750 a sheet, measured by tools/qa/garment-confine.mjs),
       and the bands are no help: in a frame that is all head, the bottom of
       the figure is the chin. */
    /* v2.3.4930: the recolour, the face drawing and the halving are
       bodyRecolor.js bakeHeadFull (moved there verbatim: the body bake's
       worker runs them too) */
    const cv = bakeHeadFull(img, { pose, skinT, pantsT: GARMENT_SPECKS_OFF ? pantsT : null, shoesT: GARMENT_SPECKS_OFF ? shoesT : null, eyeBlank: eyeBlank || null, art, ds: HEAD_DS });
    const fw = Math.max(1, Math.round(FRAME_W / HEAD_DS)), fh = Math.max(1, Math.round(FRAME_H / HEAD_DS));
    const frames = Math.max(1, Math.floor(cv.width / fw));
    /* ═══ v2.3.2775: CROPPED ═══
       Owner: "Is there any other memory savings that can be cropped?" -- then
       "Do all of it".  These are whole-body frames with only the HEAD drawn:
       measured 3% of their texels painted, 8.7 MB for the local combo's ten
       sheets and the same again for every armoured peer combo cached.  Each
       frame is cropped to the head (gearSheets.packTrimmed) and the Texture
       keeps the whole frame as `orig`, so _placePickupHead -- which scales by
       the frame's size -- reads `orig` and lands the head exactly where it
       did (TRAPS §106). */
    let verify = null;   /* QA only: see effectsRenderer _sliceStandIn's __btTrimVerify */
    try {
      if (typeof window !== 'undefined' && window.__btTrimVerify) {
        verify = document.createElement('canvas'); verify.width = cv.width; verify.height = cv.height;
        verify.getContext('2d').drawImage(cv, 0, 0);
      }
    } catch (e) { verify = null; }
    const packed = packTrimmed(cv, fw, fh, frames);
    const src = Texture.from(packed ? packed.canvas : cv).source;
    src.scaleMode = 'linear';
    src.autoGenerateMipmaps = false;    // single render scale -> mipmaps are wasted VRAM
    const out = [];
    for (let i = 0; i < frames; i++) {
      if (packed) {
        const c = packed.cells[i];
        out.push(new Texture({ source: src, frame: new Rectangle(c.ax, c.ay, c.w, c.h),
          orig: new Rectangle(0, 0, fw, fh), trim: new Rectangle(c.tx, c.ty, c.w, c.h) }));
      } else {
        out.push(new Texture({ source: src, frame: new Rectangle(i * fw, 0, fw, fh) }));
      }
    }
    if (packed) {
      _headTrimStats[key] = { fullBytes: cv.width * cv.height * 4, packedBytes: packed.canvas.width * packed.canvas.height * 4 };
      if (verify) _headTrimFrames[key] = { frames: out, full: verify, fw, fh };
      cv.width = 0; cv.height = 0;
    }
    _pickupHeadSheets[key] = out;
    _pickupHeadCap();
  }).catch(() => {
    if (attempt < 2) {
      /* v2.3.1398: the retry CHAINS into the returned promise, so the
         loading-screen gate (preloadJogHeadOverlays) waits through the
         backoff instead of passing while a flaked sheet is still
         re-fetching (owner: assets missing right after a deploy). */
      return new Promise((res) => setTimeout(res, [2000, 6000][attempt]))
        .then(() => _buildPickupHeadSheet(key, pose, dir, skinT, pantsT, shoesT, eyeBlank, art, attempt + 1, round));
    }
    _pickupHeadSheets[key] = []; /* missing dir -> caller hides the overlay */
    /* v2.3.3882: asked for again later while drawn (a facing that ships no
       head sheet, by design, costs a round now and then, ten at most) */
    _headLater.gaveUp(key, (g) => _buildPickupHeadSheet(key, pose, dir, skinT, pantsT, shoesT, eyeBlank, art, 0, g));
  });
}
/** Recolored loot-pickup head-overlay frame for (skin, pants, shoes, pose, dir,
 *  frameIdx).  Returns null outside the pickup pose, while the sheet bakes, or
 *  when no head sheet exists for that dir (only -south ships) -- the caller then
 *  leaves the body's own head showing. */
export function getPickupHeadFrame(skinId, pantsId, shoesId, pose, dir, frameIdx, phase, eyeStyleId, art) {
  /* v2.3.1368: + jog — the fullset armored figure (helmet erased from the
     sheet) gets the player's real head drawn above it, exactly like the
     pickup pose.  Only the fullset base dirs ship jog-<dir>-head.png;
     other dirs 404 -> [] -> null and nothing changes for them. */
  /* v2.3.1479: + hit / mine.  Both poses now ship armour, and gear draws
     ABOVE the body — measured on the v2.3.1477 sheets, the plate covered
     3-59 head px per hit frame and the masked bake ERASED 13-67 more on the
     frames whose recoil throws the head below its horizontal neck-restore
     band (owner: "the head ... disappears behind the armor due to AI drift").
     Drawing the head from its own sheet above the gear is the same cure the
     pickup crouch got in v2.3.1055. */
  if (pose !== 'pickup' && pose !== 'jog' && pose !== 'hit' && pose !== 'mine') return null;
  const skinT = poseSkinTarget(skinTarget(skinId), pose), pantsT = pantsTarget(pantsId), shoesT = shoesTarget(shoesId);   /* v2.3.2861: poseSkinTarget */
  const blank = eyeBlankForSheet(`${pose}-${dir}-head`, eyeStyleId);   /* v2.3.2643 */
  /* v2.3.2862: the drawings, resolved for this facing exactly as the body
     sheet resolves them -- a back-of-head sheet (hit-north) takes the back of
     the head's canvas, not the face's. */
  const a = art ? artForFacing(art, dir) : null;
  const key = _headSheetKey(skinId, pantsId, shoesId, pose, dir, blank, a);
  const entry = _pickupHeadSheets[key];
  if (entry === undefined) { _buildPickupHeadSheet(key, pose, dir, skinT, pantsT, shoesT, blank && blank.rects, a); return null; }
  if (entry === 'loading' || !entry.length) { if (entry !== 'loading') _headLater.due(key); return null; }   /* v2.3.3882 */
  /* v2.3.1389: jog callers pass the cycle `phase` (0..1) — the SAME clock
     getGearFramePhased plays the fullset armor with, so a head sheet whose
     native frame count differs from the body's (east: 25 vs 28) stays
     frame-locked to the armor instead of bobbing on the body's cadence
     (owner: "the head doesn't bob with the armor").  Same-count dirs
     resolve identically either way. */
  if (phase != null && pose === 'jog') {
    const p = ((phase % 1) + 1) % 1;
    return entry[Math.min(entry.length - 1, Math.floor(p * entry.length))];
  }
  return entry[((frameIdx % entry.length) + entry.length) % entry.length];
}

/* Pre-warm the local player's recolored body sheets so the correct skin is
   baked BEFORE the player first renders -- otherwise getBodyFrame falls back
   to the default (un-recolored) frame for the first frame(s) while the async
   recolor runs, which shows as a brief default-skin flicker on spawn.  Bakes
   the 'stand' pose (the spawn pose) for all base dirs of the current combo.
   Fires on module load (a returning player's stored combo) and whenever the
   login picker changes skin/pants/shoes -- both give plenty of lead time
   before the player presses Play and spawns. */
export function prewarmBody(skinId, pantsId, shoesId, shirtT, shirtKey) {
  const skinT = skinTarget(skinId), pantsT = pantsTarget(pantsId), shoesT = shoesTarget(shoesId);
  const anyEye = !!eyeColorTarget(getEyeColor());
  /* v2.3.2643: the eye style is read from the store HERE, unlike in
     getBodyFrame, and that is not an inconsistency: this function prewarms the
     LOCAL player by definition (its own header), which is the same licence the
     eyeFor calls below already take for the eye colour. */
  const styleId = getEyeStyle();
  const anyStyle = !!styleId && styleId !== 'none';
  const art = localBodyArt(false);   /* v2.3.1940 */
  /* v2.3.2854: a drawing edit drops every inked sheet (_dropArtSheets) and
     lands here; the inked fish sheet is rebuilt with the stand ones, so the
     next cast is not the one that pays for it.  v2.3.3146: and a new skin,
     trousers or boots change the fish sheet too (getFishFrame) -- before the
     default combo's return below, as the default skin has one of its own
     (POSE_SKIN_FLOOR) -- once preloadBodyAll has baked the first one: this
     also runs at module load, on the login screen, for a look the stored
     record may yet replace. */
  if (_fishFollows) prewarmFish(art, skinId, pantsId, shoesId);
  if (!skinT && !pantsT && !shoesT && !shirtT && !anyEye && !anyStyle && !art) return; /* default combo: nothing to bake */
  for (const dir of SOURCE_DIRS) {
    const eye = eyeFor('stand', dir, getEyeColor());   /* local player */
    const blank = eyeBlankFor('stand', dir, styleId);   /* v2.3.2643 */
    const key = bodySheetKey(skinId, pantsId, shoesId, shirtT, shirtKey, eye && eye.id, 'stand', dir, art, blank && blank.id);
    if (_bodySheets[key] === undefined) buildBodySheet(key, 'stand', dir, skinT, pantsT, shoesT, shirtT, eye && eye.t, art, blank && blank.rects);
  }
}
/** Preload the recolored body for the current combo across all base dirs for
 *  stand + jog, so an UNARMOURED player (or any moment the body shows) never
 *  flashes the default-skin frame when first turning/jogging in a direction.
 *  Resolves immediately for the default combo (base sheets are used as-is).
 *  v2.3.1118: stand + jog (all dirs) + the south-only pickup body & head overlay.
 *  Mine stays lazy -- see the notes inside for why pickup/head are cheap to
 *  prewarm now but mine and the full-res head were not. */
export function preloadBodyAll() {
  /* v2.3.756: baked shirt retired -- the body always bakes SHIRTLESS (the
     layered shirt is a separate tinted gear sprite).  The shirt machinery
     below (_torsoBands etc.) is dormant: no caller passes shirtT anymore. */
  const skinId = _skinStore.get(), pantsId = _pantsStore.get(), shoesId = _shoesStore.get();
  const skinT = skinTarget(skinId), pantsT = pantsTarget(pantsId), shoesT = shoesTarget(shoesId);
  const anyEye = !!eyeColorTarget(getEyeColor());
  const styleId = getEyeStyle();   /* v2.3.2643: local player, as prewarmBody */
  const anyStyle = !!styleId && styleId !== 'none';
  const art = localBodyArt(false), artM = localBodyArt(true);   /* v2.3.1940 */
  /* v2.3.2861: the default combo used to return here with nothing to bake.  It
     still has the hit, mine and dodge sheets, recoloured to the walking skin
     (poseSkinTarget) -- baked HERE, behind the intro, or the first hit taken would
     flash the painted orange while it baked (animation-preload law). */
  const plain = !skinT && !pantsT && !shoesT && !anyEye && !anyStyle && !art;
  const tasks = [];
  const bake = (pose, dir, a) => {
    const sT = poseSkinTarget(skinT, pose);   /* v2.3.2861 */
    if (plain && !sT) return;             /* v2.3.2861: the default combo bakes only those three */
    const eye = eyeFor(pose, dir, getEyeColor());   /* local player */
    const blank = eyeBlankFor(pose, dir, styleId);   /* v2.3.2643 */
    const key = bodySheetKey(skinId, pantsId, shoesId, null, null, eye && eye.id, pose, dir, a, blank && blank.id);
    if (_bodySheets[key] === undefined) tasks.push(buildBodySheet(key, pose, dir, sT, pantsT, shoesT, null, eye && eye.t, a, blank && blank.rects));
  };
  /* v2.3.1940: a drawn player needs the MIRRORED bake of the three flippable
     facings too (west/northwest/southeast are drawn by flipping east/northeast/
     southwest), or the first time they turn that way the drawing would pop in a
     frame late — animation-preload law, CLAUDE.md.  Undrawn players get exactly
     one bake per facing as before, because artM is null for them. */
  const prewarm = (pose, dir) => {
    bake(pose, dir, art);
    if (artM && MIRRORED_SOURCE_DIRS.indexOf(dir) !== -1) bake(pose, dir, artM);
  };
  /* v2.3.1477: + 'hit'.  The recoil sheets used to bake on the FIRST HIT
     TAKEN -- a 1536x256 recolour on the spot, right as a monster connects.
     It went unnoticed while the pose had no armour (there was nothing to see
     but a flicker); now that hit-<dir> gear ships, the same frame also wants
     a masked-body bake, so it is preloaded behind the intro like the rest. */
  for (const pose of ['stand', 'jog', 'hit']) {
    for (const dir of SOURCE_DIRS) prewarm(pose, dir);
  }
  /* ═══ v2.3.2083: + 'dodge', FOR EVERYONE AND NOT ONLY THE ARMOURED ═══
     v2.3.1534 already made this case: "a pose left off this list falls back
     to the un-recolored base frame on its first use while the bake runs,
     which for dodge would be a flash of default skin/pants the first time
     the player rolls."  It put dodge on entityRenderer's PREWARM_POSES --
     and that loop is prewarmMaskedBodyFrames, which opens with

         if (!slots.some((sl) => getEquip(sl) !== 'none')) return;

     because its own job is compositing armour onto a body.  The recoloured
     BODY bake merely rides along inside it, so the fix landed for players
     wearing a breastplate and for nobody else.  A customised player in a
     t-shirt -- which is everyone for their first few hours -- still flashed
     default skin and trousers on their first roll.

     This is the everyone-path, so it belongs here.  Two sheets: the roll is
     authored south + east only (playerSprites; entityRenderer's prewarmDirs
     says the same), and `prewarm` adds the mirrored bake of east by itself
     for a drawn player.  Animation-preloading law, CLAUDE.md. */
  for (const dir of ['south', 'east']) prewarm('dodge', dir);
  /* v2.3.1118: prewarm the pickup BODY + (downscaled) HEAD behind the intro, so
     the first armoured loot pickup doesn't hitch while they bake mid-play (the
     v2.3.1117 lazy bake traded the spawn cost for an in-play frame-rate dip on
     the first few pickups).  This is safe now: it does NOT raise the post-pickup
     memory PEAK -- those sheets bake on first use anyway, so prewarming only
     moves the one-time bake earlier, it doesn't add anything resident that lazy
     baking wouldn't.  The actual VRAM fix that stopped the iOS context loss was
     shrinking the head (v2.3.1117) and dropping the mine sheet -- and MINE stays
     lazy here (irrelevant to looting, pure VRAM waste otherwise). */
  prewarm('pickup', 'south');
  /* v2.3.1478: MINE is no longer lazy either.  The note above was written when
     the pickaxe swing had no armour to draw -- now that mine-south ships gear
     sheets, its first use pays a body recolour AND 14 masked bakes at the
     moment the player starts a gather.  The sheet is 1792x128 on disk, so at
     DISPLAY_DS=2 this is a few hundred KB. */
  prewarm('mine', 'south');
  /* v2.3.2854: and the FISH sheet with the drawings on it (getFishFrame) --
     only a drawn player has one; everyone else fishes on the raw sheet, which
     loadPlayerSprites already holds.
     v2.3.3146: every player has one now -- your skin (the walking tan for the
     default), trousers and boots go on it too (getFishFrame) -- and from here
     on it follows a change of look (prewarmBody) */
  _fishFollows = true;
  tasks.push(prewarmFish(art, skinId, pantsId, shoesId));
  /* v2.3.2862: through _headSheetKey, so it is the key getPickupHeadFrame will
     ask for.  It built its own and left out the eye style (v2.3.2643), so a
     styled player's prewarm baked a sheet nothing ever read and the first
     pickup baked the real one mid-play; now it carries the drawings too. */
  const _hBlank = eyeBlankForSheet('pickup-south-head', getEyeStyle());
  const _hArt = artForFacing(localBodyArt(false), 'south');
  const headKey = _headSheetKey(skinId, pantsId, shoesId, 'pickup', 'south', _hBlank, _hArt);
  if (!plain && _pickupHeadSheets[headKey] === undefined) tasks.push(_buildPickupHeadSheet(headKey, 'pickup', 'south', skinT, pantsT, shoesT, _hBlank && _hBlank.rects, _hArt));   /* v2.3.2861: !plain -- the default combo never reached here before */
  /* v2.3.3716: the stand and jog sheets as colour numbers, behind the same
     loading screen (not with `?lookpalette=0`).
     The bakes above are kept as they were: the armour's masked frames and the
     south block read the body's own pixels (getLookBodyFrame) */
  if (lookPaletteWanted()) tasks.push(preloadLookSheets());
  return Promise.all(tasks);
}

/** v2.3.1376: preload the JOG head-overlay sheets (jog-<dir>-head.png) for
 *  the current combo — the fullset knight figures draw the player's real
 *  head from these, and a lazy first build hitched the first armored jog in
 *  each direction (animation-preload law, CLAUDE.md v2.3.1358).  Unlike
 *  preloadBodyAll this runs for the DEFAULT combo too: the head sheets must
 *  fetch + bake regardless of recoloring. */
export function preloadJogHeadOverlays() {
  const skinId = _skinStore.get(), pantsId = _pantsStore.get(), shoesId = _shoesStore.get();
  const skinT = skinTarget(skinId), pantsT = pantsTarget(pantsId), shoesT = shoesTarget(shoesId);
  const tasks = [];
  const styleId = getEyeStyle();   /* v2.3.2643: local player, as prewarmBody */
  const want = [['jog', 'south'], ['jog', 'southwest'], ['jog', 'north'], ['jog', 'east']];
  /* v2.3.1479: the hit-react (all five base dirs) and mining (south only)
     overlays ride the same gate — a lazy first build would drop the head for
     the first hit taken, which is exactly when it is being looked at. */
  for (const dir of ['south', 'southwest', 'east', 'northeast', 'north']) want.push(['hit', dir]);
  want.push(['mine', 'south']);
  /* v2.3.2862: with the local drawings, and the mirrored bake as well for the
     directions that are also drawn flipped (west is east flipped, and so on)
     -- the same pair preloadBodyVariant bakes for the body.  A face drawing
     that is its own mirror image gives both the same key, so it bakes once. */
  const art = localBodyArt(false), artM = localBodyArt(true);
  for (const [pose, dir] of want) {
    const blank = eyeBlankForSheet(`${pose}-${dir}-head`, styleId);   /* v2.3.2643 */
    const arts = (artM && MIRRORED_SOURCE_DIRS.indexOf(dir) !== -1) ? [art, artM] : [art];
    for (const a0 of arts) {
      const a = artForFacing(a0, dir);
      const key = _headSheetKey(skinId, pantsId, shoesId, pose, dir, blank, a);
      if (_pickupHeadSheets[key] === undefined) tasks.push(_buildPickupHeadSheet(key, pose, dir, poseSkinTarget(skinT, pose), pantsT, shoesT, blank && blank.rects, a));   /* v2.3.2861: poseSkinTarget */
    }
  }
  return Promise.all(tasks);
}

/** Preload the current combo's sheets for a SPECIFIC shirt variant (both
 *  poses, all dirs).  v2.3.698: armor on/off flips the shirt bake, and the
 *  first toggle paid a full 13056x256 sheet recolor on the spot -- the
 *  'slowdown when taking armor on and off'.  The alt-worn-set prewarmer
 *  builds both variants up front.  Returns a Promise that resolves when the
 *  sheets are baked (or immediately if nothing needs baking). */
export function preloadBodyVariant(shirtT, shirtKey) {
  const skinId = _skinStore.get(), pantsId = _pantsStore.get(), shoesId = _shoesStore.get();
  const skinT = skinTarget(skinId), pantsT = pantsTarget(pantsId), shoesT = shoesTarget(shoesId);
  const art = localBodyArt(false), artM = localBodyArt(true);   /* v2.3.1940 */
  const styleId = getEyeStyle();   /* v2.3.2643: local player, as prewarmBody */
  const anyStyle = !!styleId && styleId !== 'none';
  if (!skinT && !pantsT && !shoesT && !shirtT && !anyStyle && !art) return Promise.resolve();
  const tasks = [];
  for (const pose of ['stand', 'jog', 'hit']) {   /* v2.3.1477: hit ships gear now */
    for (const dir of SOURCE_DIRS) {
      const eye = eyeFor(pose, dir, getEyeColor());   /* local player */
      const blank = eyeBlankFor(pose, dir, styleId);   /* v2.3.2643 */
      for (const a of (artM && MIRRORED_SOURCE_DIRS.indexOf(dir) !== -1) ? [art, artM] : [art]) {
        const key = bodySheetKey(skinId, pantsId, shoesId, shirtT, shirtKey, eye && eye.id, pose, dir, a, blank && blank.id);
        if (_bodySheets[key] === undefined) tasks.push(buildBodySheet(key, pose, dir, poseSkinTarget(skinT, pose), pantsT, shoesT, shirtT, eye && eye.t, a, blank && blank.rects));   /* v2.3.2861: poseSkinTarget */
      }
    }
  }
  return Promise.all(tasks).catch(() => {});
}

/* Resolve the current shirt via dynamic import (static import would form a
   cycle: playerSkins -> shirtColorCatalog -> characterPortrait -> playerSkins),
   then prewarm the spawn pose with the full combo so there's no skin-torso
   flash before the shirt bakes. */
function _prewarmCurrent() {
  /* v2.3.756: baked shirt retired -- always prewarm the shirtless body
     (this also removed the dynamic-import cycle workaround). */
  try { prewarmBody(_skinStore.get(), _pantsStore.get(), _shoesStore.get(), null, 'none'); } catch (e) { /* ignore */ }
}
_skinStore.on(_prewarmCurrent);
_pantsStore.on(_prewarmCurrent);
_shoesStore.on(_prewarmCurrent);
/* v2.3.2643: and the eye STYLE, which changes the sheet key exactly as a skin
   does (bodySheetKey's `es:` segment) and so needs the same prewarm -- without
   it the first frame after picking a style shows the old bake, which is the
   default-skin-flash this block exists to prevent, wearing the wrong face.
   Bounded like skin and unlike a drawing: four style ids, so the sheets
   accumulate to a small set and there is nothing to free. */
onEyeStyleChange(_prewarmCurrent);

/* ═══ v2.3.1940: A DRAWING CHANGES THE SHEET KEY, SO IT MUST ALSO FREE THE OLD
   ONE ═══
   Skin/pants/shoes have a fixed handful of ids, so their sheets accumulate to a
   small, bounded set.  A drawing does not: every stroke is a different 256-char
   string and therefore a different key, so re-prewarming on each one would bake
   five sheets per stroke and never release any of them.  Drop the previous
   drawing's bakes first (they can no longer be asked for -- nothing else spells
   that key), and debounce, so a fast scribble bakes once at the end of it
   rather than once per pixel. */
function _dropArtSheets() {
  for (const key of Object.keys(_bodySheets)) {
    if (key.indexOf('/#art') === -1) continue;   /* bodyArtSeg's marker */
    const entry = _bodySheets[key];
    if (Array.isArray(entry) && entry[0] && entry[0].source) {
      try { releaseCanvasSource(entry[0].source); } catch (e) { /* already gone */ }   /* v2.3.3074: Cache entry and canvas too (TRAPS §139) */
    }
    delete _bodySheets[key];
    _bodyLater.forget(key);   /* v2.3.3882 */
  }
  /* v2.3.2862: and the head overlays that carried a face drawing.  Destroyed
     on the same 30 s delay _pickupHeadCap uses: one of them may be on screen
     this frame, over your head. */
  for (const key of Object.keys(_pickupHeadSheets)) {
    if (key.indexOf('#hf') === -1) continue;
    const entry = _pickupHeadSheets[key];
    delete _pickupHeadSheets[key];
    _headLater.forget(key);   /* v2.3.3882 */
    const src = Array.isArray(entry) && entry[0] && entry[0].source;
    if (src) setTimeout(() => { try { releaseCanvasSource(src); } catch (e) { /* already gone */ } }, 30000);   /* v2.3.3074 */
  }
}
/* v2.3.2862: the local player's head overlays again, after a drawing edit
   dropped the ones that carried the old face (_dropArtSheets): the pickup head
   preloadBodyAll bakes, and the jog / hit / mine ones preloadJogHeadOverlays
   bakes.  Keys already baked are skipped, so an edit that did not touch the
   face costs a lookup per sheet. */
function _prewarmHeadOverlays() {
  const skinId = _skinStore.get(), pantsId = _pantsStore.get(), shoesId = _shoesStore.get();
  const blank = eyeBlankForSheet('pickup-south-head', getEyeStyle());
  const a = artForFacing(localBodyArt(false), 'south');
  const key = _headSheetKey(skinId, pantsId, shoesId, 'pickup', 'south', blank, a);
  if (_pickupHeadSheets[key] === undefined) {
    _buildPickupHeadSheet(key, 'pickup', 'south', skinTarget(skinId), pantsTarget(pantsId), shoesTarget(shoesId),
      blank && blank.rects, a);
  }
  preloadJogHeadOverlays();
}
let _artPrewarmT = null;
function _onArtChanged() {
  if (_artPrewarmT) clearTimeout(_artPrewarmT);
  _artPrewarmT = setTimeout(() => {
    _artPrewarmT = null; _dropArtSheets(); _prewarmCurrent();
    /* v2.3.2862: the head overlays too, so the next pickup shows the new
       drawing from its first frame rather than baking it then. */
    try { _prewarmHeadOverlays(); } catch (e) { /* never break a menu */ }
  }, 500);
}
onArtChange(_onArtChanged);
onPatternChange(_onArtChanged);   /* v2.3.1941: a trouser pattern is part of the same bake */

_prewarmCurrent();

/* v2.3.3716: the look-palette oracle's probe (mp-lookpalette), on a page that
   asks for it only */
try {
  if (typeof window !== 'undefined' && /(^|[?&])(lookpalette=1|lookprobe(=1)?)(&|$)/.test(window.location.search || '')) {
    installLookProbe({ getBodyFrame, getLookBodyFrame, getFrame, playerFrameCount,
      /* v2.3.3750: poseSkinTarget -- hit, roll, mine and fish always recolour the skin */
      touches: (L, pose, dir) => !!(poseSkinTarget(skinTarget(L[0]), pose) || pantsTarget(L[1]) || shoesTarget(L[2]) || eyeFor(pose, dir, L[3])) });
  }
} catch (e) { /* QA only */ }
