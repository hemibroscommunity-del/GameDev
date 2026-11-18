/* ═══ v2.3.6220: THE LOOK SYSTEM'S LEAVES OF effectsRenderer.js (card FX) ═══
 *
 * Top-level functions of src/rendering/systems/effectsRenderer.js that read
 * no `this` and reach no module state (the code census, part 5 of
 * docs/plan/census/M-tables.md), moved here VERBATIM -- each body byte for
 * byte, its comment with it; only `export` and the imports are new -- and
 * imported back by name.  A constant only they read came with them.
 *
 * A leaf imports nothing from the renderers (four-lines' IMPORT_CYCLE_FILES
 * has no room): only what the renderer itself imported, from the same files. */
import { buildScale, getBuildHeight, getBuildFrame } from '../traits/buildCatalog.js';
import { sideForDir, artHasInk, artHash, artIsSymmetric } from '../traits/playerArt.js';
import { parsePattern } from '../traits/patternCatalog.js';
import { DEFAULT_SKIN_TARGET, artForFacing } from '../playerSkins.js';
import { garbKey } from '../standInGarb.js';

/* ═══ v2.3.2500: A STAND-IN IS THE SAME BRO, SO IT IS THE SAME SIZE ═══
 *
 * The walking body is drawn through _applyBuildScale (entityRenderer): the
 * zone's perspective scale TIMES this bro's build (buildCatalog -- height on
 * y, frame on x).  This file had zero references to it, so every figure that
 * REPLACES the body for a few seconds -- the lumberjack, the cook, the
 * fire-lighter, and the peer twins of all three -- was drawn at the average
 * build while the body it stands in for was not.  That is a figure that
 * changes size the moment it starts working, which is what the chop stand-in's
 * "about 10% too small" report is (see the backlog triage, chop size): the
 * answer is the build multiplier, NOT a fourth bump of CHOP_STANDIN_H, which
 * has already been moved three times (84 -> 112 -> 95 -> 104.5) chasing it.
 * (v2.3.3146: the fourth, 104.5 -> 136.8, was the right one after all -- by
 * MEASUREMENT this time, against the walking figure's PLAYER_SIZE_MULT, which
 * no stand-in carries.  See the constant.)
 *
 * TODAY IT IS EXACTLY 1.0 AND CHANGES NOTHING ON SCREEN.  HEIGHT_CATALOG and
 * FRAME_CATALOG were each locked to a single 1.00 entry in v2.3.1995/1996
 * ("keep the medium build only"), and an unknown id answers 1 by the same
 * deploy-order rule, so a peer on an older client relaying `hg: 'tall'` also
 * renders 1.0.  This is the plumbing, put in where it was missing, so that the
 * day a second height goes back into that catalog the stand-ins move with the
 * body instead of being found a version later.
 *
 * NOT APPLIED TO THE SWORD AND BOW STAND-INS, on purpose: those size
 * themselves from S._swordBodyH / S._swordFootY, which entityRenderer computes
 * from `display.scale.y` -- the scale _applyBuildScale has ALREADY written.
 * Multiplying again there would square the build. */
export const _localBuild = () => buildScale(getBuildHeight(), getBuildFrame());
export const _peerBuild = (o) => buildScale(o && o.buildHeight, o && o.buildFrame);
export const _standInSheet = (url) => String(url || '').replace(/^.*\//, '').replace(/\.png.*$/, '');
/* ═══ v2.3.2500: THE SKIN-TONE PROBE, FOR THE STAND-INS THAT HAD NONE ═══
 *
 * v2.3.1788 published the mean skin RGB of the baked SWORD and BOW sheets on
 * window.__btStandInSkin so mp-standinskin could assert that a bro does not
 * change complexion when he swings.  The gathering stand-ins -- chop, cook,
 * fire -- go through their own bakes and were outside that coverage, which is
 * how the chopper kept the artist's paint for eleven versions without a test
 * noticing.  Same reading, same object, so one harness covers all five.
 *
 * WHY THE BAKED CANVAS AND NOT A SCREENSHOT: the town's cobblestone passes the
 * same warm-tone test this classifier uses (measured: ~51k "skin" pixels in an
 * 80x90 crop containing one bro), so a world screenshot gives identical
 * numbers before and after a fix.  The canvas is the thing that changed.
 *
 * _bakeBodyStrip keeps its own inline copy of this test rather than calling
 * here: it shares ONE walk of a multi-megapixel canvas with the v2.3.2431 ink
 * probe, and splitting them would add a second full read on a phone. */
/* `opts` is the SAME ratio window the sheet's own bake was given (recolorStandInSkin).
   It matters for the fire strip and only for it: the probe's warm-tone test is
   the body pipeline's, and a campfire passes it -- measured, the flame and its
   glow drag the fire figure's reported mean to [226,145,88] when the BODY it
   recoloured is at the walking palette.  Measuring with the window the bake
   used means the probe counts the pixels the bake actually retinted, which is
   the thing under test.  Same trick, same reason as v2.3.1723's gear fit:
   "fitting into the body's ALPHA silhouette gives nonsense" because the halo is
   in it. */
export function _probeStandInSkin(key, cv, opts) {
  try {
    if (typeof window === 'undefined' || !cv) return;
    const o = opts || {};
    const maxBR = o.maxBR != null ? o.maxBR : Infinity;
    const minGR = o.minGR != null ? o.minGR : 0;
    const maxGR = o.maxGR != null ? o.maxGR : Infinity;
    const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
    let n = 0, sr = 0, sg = 0, sb = 0;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3];
      if (!(a > 40 && r > g && g >= b && (r - b) > 30 && r > 90 && (r - g) > 25)) continue;
      if (b / r > maxBR || g / r < minGR || g / r > maxGR) continue;
      n++; sr += r; sg += g; sb += b;
    }
    if (!window.__btStandInSkin) window.__btStandInSkin = {};
    window.__btStandInSkin[key] = n
      ? { n, rgb: [Math.round(sr / n), Math.round(sg / n), Math.round(sb / n)] }
      : { n: 0 };
  } catch (e) { /* a probe never breaks a bake */ }
}
/* v2.3.3439: a dressed strip's cache key -- one place, as the farm waits for
   its own (_warmFarmDressed) and lets them go (_freeFarm) */
export function _dressedKeyOf(item, pose, dir, look, tint, mirror) {
  const side = sideForDir(dir);
  const art = look.art ? look.art[side] : null;
  return (art ? look.key[side] : 'x') + '.' + look.pat + '.' + (tint ? tint.join('_') : 'x')
    + '/' + (mirror ? 'm' : 'n') + '/' + item + '/' + pose + '/' + dir;
}
export function _shirtLookOf(front, back, patternStr) {
  const f = artHasInk(front) ? front : null, b = artHasInk(back) ? back : null;
  const pattern = parsePattern(patternStr, 'shirt');
  if (!f && !b && !pattern) return null;
  return { art: (f || b) ? { front: f, back: b } : null, pattern,
    key: { front: f ? artHash(f) : 'x', back: b ? artHash(b) : 'x' },
    pat: pattern ? pattern.id + '-' + pattern.colorIdx : 'x' };
}
/** The colours a gathering figure is baked in, as one key: the skin (the
 *  'default' pick is the explicit tan, as every stand-in bake has it), the
 *  trousers and the boots ('-': the art's own). */
/* v2.3.4037: + the garb (standInGarb.js): the trouser and shoe patterns and
   the trouser print are baked into the figure now, so a figure is handed only
   to a player wearing the same ones (TRAPS §189) */
export function _standInColourKey(skinT, pantsT, shoesT, garb) {
  return (skinT || DEFAULT_SKIN_TARGET).join(',') + '|' + (pantsT ? pantsT.join(',') : '-')
    + '|' + (shoesT ? shoesT.join(',') : '-') + '|' + garbKey(garb);
}
/* Would the pre-flipped bake of this sheet differ from the plain one?  Asked
   of the art AFTER artForFacing, because that is what actually gets stamped:
   a north sheet stamps the BACK canvases, so the front ones' symmetry is not
   the question.  (v2.3.2429 / v2.3.2431; module scope since v2.3.2863, when a
   peer's stand-in bakes started asking it too.) */
export function _twinWouldDiffer(art, dir) {
  if (!art) return false;
  if (parsePattern(art.pantsPattern, 'pants') || parsePattern(art.shoesPattern, 'shoes')) return true;
  const a = artForFacing(art, dir);
  return ['pants', 'tattoo', 'tattooFace', 'tattooArm']
    .some((k) => artHasInk(a[k]) && !artIsSymmetric(a[k]));
}
