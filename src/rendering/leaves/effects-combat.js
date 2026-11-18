/* ═══ v2.3.6220: THE COMBAT SYSTEM'S LEAVES OF effectsRenderer.js (card FX) ═══
 *
 * Top-level functions of src/rendering/systems/effectsRenderer.js that read
 * no `this` and reach no module state (the code census, part 5 of
 * docs/plan/census/M-tables.md), moved here VERBATIM -- each body byte for
 * byte, its comment with it; only `export` and the imports are new -- and
 * imported back by name.  A constant only they read came with them.
 *
 * A leaf imports nothing from the renderers (four-lines' IMPORT_CYCLE_FILES
 * has no room): only what the renderer itself imported, from the same files. */
import { pageAddress, sw } from '@/game/switches.js';
import { DynamicBitmapFont, BitmapFont, Cache } from 'pixi.js';

/* ═══ v2.3.2516: WHICH SWINGS THE BODY OCCLUDES ═══
 * Owner (D7, backlog triage 2026-09-14 §5.8): the greatsword at southwest goes
 * behind the body "for jog/idle AND for the attack swing -- it is in the right
 * hand, facing away from the camera".  entityRenderer's heldWeaponInFront is
 * the jog/idle half; this is the swing's.
 *
 * IT CANNOT BE DECIDED FROM THE SHEET KEY, nor from the swing's own direction,
 * and that is the whole reason this is a function and not one more
 * `=== 'north'`.  TWO separate 4-way collapses stand between the swing and the
 * word "southwest":
 *
 *   the SHEET.  There are three swing sheets.  _swordFacing maps southwest AND
 *   southeast AND south onto `['south', ...]`, and the mirror flag cannot
 *   separate them either, because southwest and south are BOTH unmirrored.
 *   Keying the exception here would move southeast -- which the owner's answer
 *   names as unchanged -- along with southwest.
 *
 *   `S._swordSwingDir`.  It reads like the answer and is not: v2.3.936 resolves
 *   it by DOMINANT AXIS ("the big sword sweeps a wide arc, so 3 sheets cover
 *   everything"), so its only values are east / west / south / north and a
 *   southwest swing arrives as 'south'.  Measured before this comment was
 *   written: a southwest-pinned swing reported sheet 'south', facing 'south'.
 *
 * So it is asked of `S._renderFacing`, the true 8-way compass entityRenderer
 * publishes each frame -- which is exactly what _placeStandInShield reasoned its
 * way to at v2.3.1784, in the same words, for the same collapse.  The peer path
 * has no such publication for someone else's swing and resolves the peer's own
 * swing angle to the same eight sectors instead.
 *
 * north keeps its v2.3.1047 behaviour unchanged: back to camera, blade on the
 * far side. */
export function _swingBehind(sheetKey, facing8) {
  return sheetKey === 'north' || facing8 === 'southwest';
}
/* ═══ v2.3.2310: A PROJECTILE'S SHEET IS NOT ALWAYS 256 ═══
 * projectileScalePx (monsterVariants) is stated in ON-SCREEN pixels, so the
 * divisor that turns it into a Sprite scale has to be the source's real width.
 * It was hard-coded to 256 -- true of the fire goblin's fireball.png and false
 * of the recoloured slime orb, which is 128, so the blue slime's ball drew at
 * half the size the constant asked for.  Measuring costs one property read per
 * texture change and cannot go stale when new art lands at a new size.
 * 256 is kept as the fallback so a texture that will not answer behaves exactly
 * as it did before this change. */
export function _projSrcPx(tex) {
  if (!tex) return 256;
  const w = (tex.frame && tex.frame.width) || tex.width || (tex.source && tex.source.width) || 0;
  return w > 0 ? w : 256;
}
/* ═══ v2.3.3033: DAMAGE NUMBERS ARE 1.75x BIGGER ═══
   Owner, 2026-10-04: "Damage numbers for players and monsters needs to be
   about anywhere from 1.5-2x bigger".  The two sizes above are WORLD pixels,
   and the Wheel draws the world at about 0.6 of a CSS pixel each (the bro 64
   px tall), so a plain hit read 13 CSS px beside a character five times its
   height.

   1.75 is the middle of what was asked for, applied to EVERY damage number --
   a hit you deal (and a crit), a hit on you, a teammate's blow, a tick of
   burn or poison -- so their sizes keep every relation v2.3.2211 and v2.3.3026
   set: the crit still 1.8x the plain one, each mark as tall as its number (the
   22 px cap scales too), the element badge cut to its own box.  What is NOT a
   damage number keeps its size: "Blocked!", "Dodged", "+30 XP", "+25 G", a
   heal's "+12" and every word are DMG_FONT_PX as ever, so a kill's number is
   the biggest thing over the monster and its XP and gold read under it.
   (v2.3.3192: no longer -- every one of those is now the plain hit's size, the
   owner's ask; see MSG_FONT_PX below.)

   `?dmgscale=1.5` .. `?dmgscale=2` (1 .. 3) tries another size in a tab, the way
   `?zoom=` does, so nobody waits for a build to see 1.5 or 2.  Where it is
   applied -- the size, the lift that keeps the bigger glyph's bottom edge off
   the bar, the stacking, the climb, the mark -- is the mint in
   `_updateDamageNumbers` ("HOW BIG, AND HOW HIGH"). */
export function readDmgScale() {
  try {
    const q = new URLSearchParams(pageAddress()).get('dmgscale');
    const v = q == null ? NaN : parseFloat(q);
    if (isFinite(v)) return Math.min(3, Math.max(1, v));
  } catch (e) { /* no window: the default */ }
  return 1.75;
}
/* v2.3.2504: channel-wise lerp between two packed 0xRRGGBB colours.  Used by
   the lock chip's first-second flash; kept at module scope because it is two
   lines and a per-frame closure in the draw path is the kind of allocation
   this file has had to unpick before. */
export function _mixHex(a, b, t) {
  const k = t < 0 ? 0 : (t > 1 ? 1 : t);
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (((ar + (br - ar) * k) | 0) << 16)
    | (((ag + (bg - ag) * k) | 0) << 8)
    | ((ab + (bb - ab) * k) | 0);
}
/* v2.3.1357: pre-baked glyph atlas for PLAIN NUMERIC popups (damage /
   XP / gold — the overwhelming majority in combat).  Every `new Text`
   is a synchronous canvas rasterization; profiling a 12-monster pack
   fight showed popup MINT RATE (not live count) dominating the frame
   (avg -55ms and the 400ms spikes vanished with popups suppressed).
   +100-HP fights run several times longer, so that churn is sustained
   — the owner's "running badly" report.  BitmapText assembles glyphs
   from this atlas at near-zero cost.  Glyphs bake WHITE + black stroke
   at 2x the base popup size (scaled down at use = crisp on retina);
   tint colors the fill while the black stroke stays black (0 x tint).
   Popups needing canvas features keep classic Text: emoji (own style),
   specials (dropShadow halo), and any char outside the baked set. */
export const DMG_BMP_FONT = 'bt-dmg-digits';
/* ═══ v2.3.5008: THE DIGITS AT 128, THE WORDS AT THEIR OWN SIZE ═══
   The memory survey (mp-gpuaudit, 2026-11-13): on arrival the one font's
   pages were the biggest thing on the graphics chip that had no name, 14.6
   MB -- eleven canvases of 512 x 512 with a mip chain, 1.33 MB each (the
   6.7 MB above, and TRAPS §137's, counted each page at its 400 x 400
   layout size and without the mips).  All 67 characters were baked at 128
   for a crit's sake, but a crit is only ever digits (DMG_PLAIN_RE: no
   letter in a damage number); the letters are drawn in messages ("Dodged!",
   "+12 XP", "Blocked!"), and a message is the plain number's size, 22.3 CSS
   px (MSG_FONT_PX at POPUP_ZOOM): 67 device px on a 3x phone, 74 with a
   crit-flagged note's 10% wiggle.  So two fonts:
     - DMG_BMP_FONT, the digits and '+-. !' at 128 (3 pages, 4.0 MB): every
       damage number and crit, drawn exactly as before;
     - DMG_WORD_FONT, all 67 at 80 on ONE page of 1024 x 1024 (5.3 MB):
       anything with a letter, drawn at 0.84x its bake (0.93x at the
       wiggle's widest), so never enlarged (TRAPS §137's rule).
   14.7 -> 9.3 MB on the chip.  Why 80 on a 1024 page: pixi stores a page at
   resolution bake / 100, and 512 / 0.8 = 640 and 1024 / 0.8 = 1280 are
   whole layout px; a bake of 76 (three 512 pages, 4.0 MB) made a page
   673.7 layout px wide, which QA's exact read-back (drawnPixels) could not
   read texel for texel.  At 512 the 80 bake takes five pages (6.7 MB); the
   1024 page packs the same glyphs into one (measured with the page's own
   install in Chromium's sans-serif).  The digits' pages stay 512 (one 1024
   page would be 5.3 MB against three 512s' 4.0).  A message with a letter
   drawn bigger than the words' bake allows (none today: a damage number has
   no letter) is classic Text, as one outside the set always was.
   `?dmgwords=0`: the one font of 67 at 128, as before. */
export const DMG_WORD_FONT = 'bt-dmg-words';
export const DMG_WORDS_ON = !(typeof location !== 'undefined' && sw('dmgwords'));   /* v2.3.5343: the reader cannot throw */
export function _installOneDmgFont(name, bakePx, chars, family, pagePx, padding) {
  /* v2.3.5008: a page size of its own -- pixi reads it from its defaults
     only (BitmapFont.install passes none), so set for this install alone */
  const D = DynamicBitmapFont.defaultOptions;
  const was = D.textureSize;
  if (pagePx) D.textureSize = pagePx;
  try {
    BitmapFont.install({
      name,
      style: {
        fontFamily: family || 'Source Sans 3, sans-serif',
        fontSize: bakePx,
        fontWeight: '800',
        fill: '#ffffff',
        stroke: { color: '#000000', width: 14 * bakePx / 100 },
      },
      chars,
      ...(padding ? { padding } : null),
    });
  } finally { D.textureSize = was; }
  /* BitmapFont.install hands nothing back; the font is in Pixi's cache */
  return Cache.has(name + '-bitmap') ? Cache.get(name + '-bitmap') : null;
}
export const _dmgFontNames = () => (DMG_WORDS_ON ? [DMG_BMP_FONT, DMG_WORD_FONT] : [DMG_BMP_FONT]);
export function _dmgSig(fonts) {
  /* v2.3.5008: the fonts' together (both are drawn in one face) */
  let out = '';
  for (const font of fonts || []) {
    const c = font && font.chars;
    if (!c) return null;
    for (const k of Object.keys(c).sort()) out += k + ':' + c[k].xAdvance + ',';
    out += '|';
  }
  return out || null;
}
