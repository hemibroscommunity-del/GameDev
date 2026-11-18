/* ═══ v2.3.6200: skills's leaves from entityRenderer.js (card EN, grand plan 5.5, M's line 8) ═══
 *
 * Top-level functions of src/rendering/systems/entityRenderer.js that read
 * no `this` and reach no module state, moved VERBATIM (only `export` and
 * the imports are new), with the constants they read; imported back by the
 * same names.  A leaf imports nothing from the renderers (four-lines'
 * IMPORT_CYCLE_FILES has no room).  The census: part 5 of
 * docs/plan/census/M-tables.md (tools/dev/render-code-census.mjs).
 */
import { MIRROR_SCREEN_DIR } from '../tables/look.js';
import { clipHair } from '../hairClip.js';

/* ── v2.3.6200: level 0 ── */
/* v2.3.867: composite the player's CURRENT traits (hat / beard / hair) onto a
   stand-in skill sprite — the pre-drawn chopper / cook / fire-lighter that
   REPLACES the trait-composed body during woodcutting / cooking / firemaking.
   Standalone version of _placeTrait: the caller (effectsRenderer) owns the
   three sprites and passes the crown WORLD position (computed from the
   stand-in's own transform), a scale, and the trait direction (south for the
   front-facing cook/fire, east for the side-facing chopper).  No 256-frame /
   spriteBody assumptions — placement is purely world-space. */
export function _placeStandaloneTrait(sprite, entry, dir, mirror, cwx, cwy, scaleVal, liftY, mulX) {
  if (!sprite) return;
  /* v2.3.1305: same native-color fallback as _placeTrait — see there. */
  const tex = entry && (entry.tex[dir] || (entry.fallbackTex && entry.fallbackTex[dir]));
  const meta = entry && entry.meta;
  const anchorPx = (meta && meta.anchors && meta.anchors[dir]) || null;
  if (!(tex && meta && meta.fullFrame && anchorPx)) {
    sprite.visible = false;
    /* v2.3.3860: why, as _placeTrait says it (the head-frame count, headFrames.js:
       'design' a facing the piece does not ship -- the stand-in faces its own way) */
    sprite._btHide = !entry ? 'entry' : !meta ? 'meta'
      : !anchorPx ? ((meta.anchors && !meta.anchors[dir]) ? 'design' : 'anchor') : !tex ? 'tex' : 'frame';
    return;
  }
  sprite._btHide = null;
  if (sprite.texture !== tex) sprite.texture = tex;
  const screenDir = mirror ? (MIRROR_SCREEN_DIR[dir] || dir) : dir;
  const _pick = (obj) => obj && (obj[screenDir] != null ? obj[screenDir] : obj[dir]);
  const nudge = _pick(meta.crownNudge) || [0, 0];
  const dscale = (_pick(meta.scale) || 1);
  const m = mirror ? -1 : 1;
  /* v2.3.1532: the SAME 256-space normalisation _placeTrait got in v2.3.1526,
     which this second placement path was missed by.  meta.anchors is in the
     256 frame the art was authored in; trait art is stored at 128 now.  The
     old line divided by the TEXTURE's width, so a 128 texture doubled the
     anchor fraction — the pivot ran off the end of the sprite and the trait
     flew off the head at half size on every stand-in pose (owner: "during the
     attack animations for bow and sword the head customization flies off the
     head" — the sword-swing and bow-shot stand-ins composite through here, as
     do chop / cook / firemaking).  Divide by the 256 frame and multiply the
     draw scale by 256/texWidth, so a trait still stored at 256 gets norm=1
     and is untouched. */
  const W = 256;
  const norm = W / (tex.width || W);
  sprite.anchor.set(anchorPx[0] / W, anchorPx[1] / W);
  sprite.x = cwx + nudge[0] * scaleVal * m;
  /* v2.3.1561: liftY is the float-above-hair clearance (256-space, same
     units as crownNudge) — the stand-in poses composite through here, so
     without it the halo would sink back onto the hair mid-chop/mid-swing. */
  sprite.y = cwy + (nudge[1] + (liftY || 0)) * scaleVal;
  /* v2.3.1943: mulX is the band refit — the stand-in poses composite through
     here, so without it a headband would snap back to its bare-head width for
     the quarter-second of every swing, chop and cook. */
  sprite.scale.x = m * scaleVal * dscale * norm * (mulX || 1);
  sprite.scale.y = scaleVal * dscale * norm;
  /* v2.3.2363: the SECOND placement path gets the meta's alpha too.  TRAPS #15
     is the receipt for what happens when a trait property lands in only one of
     these two -- the attack stand-ins composite through here, so without this
     the goggles would snap to fully opaque for the quarter-second of every
     swing, shot, chop and cook.  A hair-clip MASK also comes through this
     function carrying its HAT's meta; no hat sets alpha, so masks stay at 1. */
  sprite.alpha = (meta.alpha != null) ? meta.alpha : 1;
  sprite.visible = true;
}
/** Hide a stand-in trait set's cape layers, and drop the hood's hair clip.
    Not exported: hideSkillTraits below is the door every caller already uses,
    and a second one would be a way to take the cape down without taking the
    clip with it. */
export function hideStandInCape(sprites) {
  if (!sprites) return;
  if (sprites.capeBack) sprites.capeBack.visible = false;
  if (sprites.capeHood) sprites.capeHood.visible = false;
  /* The clip goes with them.  Leaving _btReady set would clip the hair to a
     hood that is not on screen -- a bald patch, which is the exact bug the
     capehair probe caught on the walking path at v2.3.2186. */
  if (sprites.capeHoodMask) {
    sprites.capeHoodMask.visible = false;
    sprites.capeHoodMask._btReady = false;
  }
}

/* ── v2.3.6201: main's level 1 ── */
/** Hide all three skill-trait sprites (no stand-in active this frame). */
export function hideSkillTraits(sprites) {
  if (!sprites) return;
  hideStandInCape(sprites);                                  /* v2.3.2190 */
  if (sprites.hat) sprites.hat.visible = false;
  if (sprites.beard) sprites.beard.visible = false;
  if (sprites.eyewear) sprites.eyewear.visible = false;   /* v2.3.2361 */
  if (sprites.eyestyle) sprites.eyestyle.visible = false;   /* v2.3.2643 */
  if (sprites.species) sprites.species.visible = false;   /* v2.3.2682 */
  if (sprites.hair) sprites.hair.visible = false;
  /* v2.3.1776: drop the clip with them.  A hair sprite that is hidden while
     still holding a mask keeps Pixi doing the stencil work for something
     nobody can see, and the next pose to reuse this set would inherit the
     previous hat's silhouette. */
  if (sprites.hair && sprites.hair.mask) clipHair(sprites.hair, null);   /* v2.3.3459 */
  if (sprites.hairMask) sprites.hairMask.visible = false;
}
