/* ═══ v2.3.4031: A STAND-IN WEARS YOUR TROUSER AND SHOE PATTERNS, AND YOUR TROUSER PRINT ═══
 *
 * The owner: "Shoes and patterns aren't showing while hoeing."  The farmer,
 * like the lumberjack, the cook and the fire-lighter, is a stand-in: a painted
 * figure drawn in place of the body, baked by playerSkins' _standInBake.  That
 * bake retinted the trousers and the boots (v2.3.3146) and stamped the face,
 * chest and arm drawings, and stopped there: the trouser pattern, the shoe
 * pattern and the trouser print, which the walking bake stamps
 * (recolorBodyToCanvas), were never passed to it -- TRAPS §73 again, "a second
 * bake site does not inherit the first one's arguments".
 *
 * This module is what the stand-ins need to carry them (the "garb"):
 *   - the three, yours from the stores or a peer's off the wire, sanitised,
 *     with ONE key for them, which joins the figure's colour key: a figure
 *     baked in one player's patterns is handed to nobody in other ones
 *     (TRAPS §189);
 *   - each figure's scale against the walking body, as a tile's `cell` is in
 *     the 256 sheet's own pixels (STANDIN_GARB_K);
 *   - one subscription that re-bakes a figure when any of the three changes.
 * docs/specs/gathering-look.md section 8. */
import { getArt, artHasInk, artHash, sanitizeShirtArt, onArtChange } from './traits/playerArt.js';
import { getPattern, sanitizePattern, onPatternChange } from './traits/patternCatalog.js';
import { FARM_ANIM_HEAD } from '../data/farmAnims.js';

/* v2.3.4031: each stand-in's pixels against the walking body's.  The walking
   body is baked from 256 px sheets in which you stand 189 px from crown to
   boots, your head 51 px across (mp-gatherlook's ART table), and a pattern's
   `cell` is in those pixels.  A strip whose figure is bigger gets cells that
   much bigger, so the stripes are the same on screen -- the shirt's
   SHIRT_PATTERN_K (effectsRenderer), which is against the 128 shirt sheet,
   halved; the fire-lighter's without its 0.85, which is his shirt LAYER's
   scale, not his body's:
     chop  the lumberjack upright, 170 px head to boots in his 220 cell;
     cook  crouched, so by his head: 85 px;
     fire  standing, 381 px in his 512 cell;
     farm  the farmer's head, FARM_ANIM_HEAD (64) px. */
const WALK_UP = 189, WALK_HEAD = 51;
export const STANDIN_GARB_K = Object.freeze({
  chop: 170 / WALK_UP,
  cook: 85 / WALK_HEAD,
  fire: 381 / WALK_UP,
  farm: FARM_ANIM_HEAD / WALK_HEAD,
});

/** The garb from three strings, or null when there is nothing to stamp. */
function _garb(pantsPattern, shoesPattern, pantsArt) {
  const q = sanitizePattern(pantsPattern, 'pants');
  const f = sanitizePattern(shoesPattern, 'shoes');
  const p = artHasInk(pantsArt) ? pantsArt : '';
  if (!q && !f && !p) return null;
  return { pantsPattern: q, shoesPattern: f, pantsArt: p,
    key: (q || '-') + '/' + (f || '-') + '/' + (p ? artHash(p) : '-') };
}

/* yours, re-made only when one of the three strings changes (asked every
   frame a peer gathers, through _localStandInColourKey) */
let _mineRaw = null, _mine = null;
/** Your garb as you wear it now (the FRONT trouser print: every stand-in faces
 *  you or the side, never away), or null. */
export function localGarb() {
  const q = getPattern('pants'), f = getPattern('shoes'), p = getArt('pants');
  const raw = q + '|' + f + '|' + p;
  if (raw !== _mineRaw) { _mineRaw = raw; _mine = _garb(q, f, p); }
  return _mine;
}

/** A peer's garb off their record, through the sanitisers every peer look
 *  passes (entityRenderer _remoteBodyArt); kept on the record while its
 *  strings stay the same, as the shirt's look is (_peerShirtLook). */
export function peerGarb(o) {
  if (!o) return null;
  const raw = (o.pantsPattern || '') + '|' + (o.shoesPattern || '') + '|' + (o.pantsArt || '');
  if (o._garbRaw !== raw) {
    o._garbRaw = raw;
    o._garb = _garb(o.pantsPattern, o.shoesPattern, sanitizeShirtArt(o.pantsArt) || '');
  }
  return o._garb;
}

/** The garb's part of a figure's key ('-': none). */
export function garbKey(g) { return g ? g.key : '-'; }

/** Calls `fn` when your trouser or shoe pattern changes, or (0.4 s after the
 *  strokes stop, as the drawings' own re-bakes wait) your trouser print.
 *  Returns the unsubscriber, which also drops a re-bake still waiting. */
export function onGarbChange(fn) {
  let t = 0;
  const offPat = onPatternChange((slot) => { if (slot === 'pants' || slot === 'shoes') fn(); });
  const offArt = onArtChange((id) => {
    if (id !== 'pants') return;
    clearTimeout(t);
    t = setTimeout(fn, 400);
  });
  return () => { offPat(); offArt(); clearTimeout(t); };
}
