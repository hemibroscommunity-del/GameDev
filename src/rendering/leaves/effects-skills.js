/* ═══ v2.3.6220: THE SKILLS SYSTEM'S LEAVES OF effectsRenderer.js (card FX) ═══
 *
 * Top-level functions of src/rendering/systems/effectsRenderer.js that read
 * no `this` and reach no module state (the code census, part 5 of
 * docs/plan/census/M-tables.md), moved here VERBATIM -- each body byte for
 * byte, its comment with it; only `export` and the imports are new -- and
 * imported back by name.  A constant only they read came with them.
 *
 * A leaf imports nothing from the renderers (four-lines' IMPORT_CYCLE_FILES
 * has no room): only what the renderer itself imported, from the same files. */
import { CHOP_INK_KEYS, CHOP_OFFSET, COOK_STANDIN_H, COOK_PAN_DX } from '../tables/skills.js';
import { artHasInk, artIsSymmetric, sanitizeShirtArt } from '../traits/playerArt.js';
import { toolKeyMask, isLitToolKey } from '../toolRecolor.js';
import { recolorStandInSkinSplit } from '../playerSkins.js';
import { COOK_KEEP_X, COOK_INK_REGIONS } from '../standInInk.js';
import { STANDIN_GARB_K } from '../standInGarb.js';
import { Sprite, Texture } from 'pixi.js';
import { treeChopOffset } from '@/game/tierTrees.js';
import { FIRE_FRAME_OFF, FIRE_FIGURE_X } from '../../data/fireStrip.js';

/** Would the pre-flipped bake differ from the plain one?  Only when a drawing
 *  that gets stamped is not its own mirror image -- see _bakeChopStrips. */
export function _chopArtAsymmetric(art) {
  return !!art && CHOP_INK_KEYS.some((k) => artHasInk(art[k]) && !artIsSymmetric(art[k]));
}
/** A peer's three skin drawings, through the same sanitiser every peer drawing
 *  passes (entityRenderer's _remoteBodyArt), or null when they have none. */
export function _peerChopArt(o) {
  const t = sanitizeShirtArt(o && o.tattooArt), ft = sanitizeShirtArt(o && o.faceTattooArt);
  const at = sanitizeShirtArt(o && o.armTattooArt);
  return (t || ft || at) ? { tattoo: t || '', tattooFace: ft || '', tattooArm: at || '' } : null;
}
/** The axe as the FILE has it, read before anything is painted: the recolour
 *  finds the key by hue and the drawing palette's pink (#d76ba8) sits inside
 *  that window -- the fishing rod's lesson (v2.3.2854), where a pink tattoo
 *  turned to pine.  Here it would have turned to copper. */
export function _chopKeyMask(img) {
  const w = img.width, h = img.height;
  const g = img.getContext('2d', { willReadFrequently: true });
  return toolKeyMask(g.getImageData(0, 0, w, h).data, w, h);
}
/* ═══ v2.3.2856: THE COOK'S DRAWINGS RIDE A LAYER OF THEIR OWN ═══
   See _bakeCookStrips.  The cook's skin bake is shared: other players' cooks
   are drawn from it (the SPEC table's v2.3.1713 note), so your drawings cannot
   be baked into it or every cook at every campfire would wear them.  They go
   on a layer drawn over it instead -- only the pixels they change, cropped: at
   most about half the figure's 4.5 MB per strip (every cell of the face, both
   arms and the chest drawn), and a small drawing a sliver of it. */
export const COOK_FW = 213, COOK_FH = 220;
/* v2.3.3314: `ms`, when given, gives up after that long -- a request that
   never answers would otherwise hold its caller's pending flag for good
   (_peerFigFrames, which passes it; the other callers wait as before). */
export function _loadStandInImg(url, ms) {
  return new Promise((res, rej) => {
    const im = new Image();
    const t = ms > 0 ? setTimeout(() => { im.onload = null; im.onerror = null; rej(new Error('stand-in strip: no answer in ' + ms + ' ms')); }, ms) : 0;
    im.onload = () => { clearTimeout(t); res(im); };
    im.onerror = (e) => { clearTimeout(t); rej(e); };
    im.src = url;
  });
}
/** One cook strip, split: the skin bake (`cv`, the shared figure) and the
 *  drawings' layer (`ink`, a canvas, or null when there are none). */
export function _bakeCookSplit(img, skinT, art, clothes) {
  /* v2.3.3146: + `clothes` ({ pantsT, shoesT }): your trousers and boots,
     the pan kept out of them by where it is (playerSkins _standInClothes) */
  /* v2.3.4037: + `clothes.garb`, the patterns and print, at his scale (patK):
     in the figure, not the drawings' layer, as his colours are */
  return recolorStandInSkinSplit(img, skinT, COOK_FH, { keepX: COOK_KEEP_X, art, regions: COOK_INK_REGIONS, frameW: COOK_FW, patK: STANDIN_GARB_K.cook, ...(clothes || {}) });
}
/* v2.3.3697: the box the farmer's shine is laid across (glint.js `uFig`), on
   a sprite that is never drawn: a walking body's frame where his boots are, as
   wide as a standing figure's frame and fitted, as his shade is, to his own
   crown and boots (`fit`, fittedShadeSpan; `stand`, standShadeSpan) */
export function placeFarmFigProxy(px, x, fit, stand, bl) {
  if (!px) return;
  const k = Math.abs((bl && bl.sx) || 1) / Math.abs((bl && bl.sy) || 1);
  px.x = x;
  px.y = fit[1];
  px.scale.set((stand[1] - stand[0]) * k, fit[1] - fit[0]);
  px.visible = true;
}
export function makeFarmFigProxy(layer, label) {
  const px = new Sprite(Texture.WHITE);
  px.anchor.set(0.5, 1);
  px.renderable = false;   /* never drawn: only its box is read */
  px.visible = false;
  px.label = label;
  layer.addChild(px);
  return px;
}
/* ═══ v2.3.2915: WHERE THE LUMBERJACK AND THE COOK STAND -- ONE ANSWER ═══
 *
 * Owner: "check all other broadcasted player animations to make sure they
 * match what your character does client side."
 *
 * Neither skill moves you: you chop from wherever the tree offered you the
 * button (routinely 120-240 px from its base -- see mp-chopyield) and cook from
 * wherever you stand by your fire.  Your own screen draws the figure where the
 * WORK is -- the lumberjack 30 px off the trunk on its ground line (44 since
 * v2.3.3146: CHOP_OFFSET), the cook
 * with the pan over the flames -- while a peer's copy was drawn at their
 * POSITION, 6 px below their middle: a lumberjack swinging at air up in the
 * canopy, a cook frying beside the fire.
 *
 * So the spot is computed here, once, and both figures read it: the local
 * placers with their own node, _updateRemoteExtraction with the same node on
 * the watcher's side (the tree from the chopper's gather_node relay, the fire
 * from their campfire_lit).  The zone curve is sampled at the spot, as the
 * local placers always did (v2.3.2287) -- the figure stands at the tree, which
 * on a perspective zone is a different point on the curve from the player. */
/* v2.3.3345: ...for a trunk as broad as the old pine's.  Each wood's tree is
   its own picture now, from the slim pine to the broad gnarled hardwood, so
   the figure stands off by the trunk's own width (game/tierTrees.js
   treeChopOffset: 44 for a broad trunk, up to 55 for the slim pine) and the
   blade bites inside it whatever its size. */
export function chopStandInSpot(zone, node, sign) {
  const x = node.x - sign * (node && node.nodeType === 'tree' ? treeChopOffset(node) : CHOP_OFFSET);
  const pscale = 1;
  return { x, y: node.y + 6 * pscale, pscale };
}
export function cookStandInSpot(zone, fire) {
  const pscale = 1;
  return { x: fire.x - COOK_STANDIN_H * COOK_PAN_DX * pscale, y: fire.y + 8 * pscale, pscale };
}
/* v2.3.1713: the firemaking strip's frame box, shared by the body bake, the
   gear layers, the trait crowns and the remote stand-in — they all slice the
   SAME grid, and crowns.json is generated against it, so a re-cut strip has to
   move all of them together (the comment at _skillTraitMul says the same thing
   about the chop/cook widths).
   v2.3.1715: 161x220 x29 -> 384x512 x8.  The owner replaced this animation
   outright with an 8-frame set (body + shirt + chest + legs, generated
   together); the 29-frame strip is RETIRED, there is no fallback to it and
   nothing may assume 29 again.  384x512 is the supplied art's own cell size, so
   the sheets ship unresampled — see tools/build_fire_8f.mjs for the measurement
   that says one new cell IS one old frame at 512/220 = 2.327x, which is why the
   drawn height FH below stays 154 and the figure's on-screen size is unchanged.
   THE TWO KNOCK-ONS, both easy to miss: _skillTraitMul.fire had to be scaled by
   the same 2.327 (it multiplies sp.scale.y, which fell 0.7 -> 0.3008, to size
   the player's hat), and _updateRemoteExtraction divided by a hardcoded 220. */
export const FIRE_FW = 384, FIRE_FH = 512;
/* ═══ v2.3.3666: WHERE EACH FRAME OF THE FIRE-LIGHTER IS DRAWN ═══
   The owner: "work on the fire starting animation to replace the log and flame
   in the animation with actual log art and code drawn smoke and flames".  The
   strip's painted fire is out (tools/build_fire_clean.py); the light's fire is
   the campfire's own, drawn in code from the strike on (campfireFx.js).  For a
   fire that stays put on the log, the log has to stay put, and it did not:
   the second row of the owner's sheet (frames 4-7) was drawn 27 art px higher
   and a few to the side, the figure with it -- the bro hopped ~7 world px up at
   frame 4 and dropped back when the light ended.  And the figure stands at
   x 243 of his 384 px frame, so he was drawn 14 world px to the side of you
   at both ends of every light.  Both measured by the tool (src/data/fireStrip.js);
   this is where frame `fi` goes, in world px, for a figure scaled (sx, sy):
   the figure's middle on your x, each frame's log on frame 0's.  Everything
   drawn with the figure (clothes, armour, hair, drawings) is placed from it,
   so it follows. */
export function _fireFrameShift(fi, sx, sy) {
  const o = FIRE_FRAME_OFF[fi] || FIRE_FRAME_OFF[0];
  return [(FIRE_FW / 2 - FIRE_FIGURE_X + o[0]) * sx, o[1] * sy];
}
/* v2.3.3684: the lit key pixels within FIRE_LOG_LIT_REACH of the key itself;
   `?firelit=0` leaves them pink, the game as it was */
export const FIRE_LOG_LIT_REACH = 4;
export function _litLogKey(fd, w, h, key) {
  const lit = new Uint8Array(w * h);
  let any = 0;
  for (let i = 0, o = 0; i < lit.length; i++, o += 4) {
    if (!key[i] && isLitToolKey(fd[o], fd[o + 1], fd[o + 2], fd[o + 3])) { lit[i] = 1; any++; }
  }
  if (!any) return null;
  const R = FIRE_LOG_LIT_REACH;
  for (let i = 0; i < lit.length; i++) {
    if (!lit[i]) continue;
    const x = i % w, y = (i - x) / w;
    let near = false;
    for (let yy = Math.max(0, y - R); yy <= Math.min(h - 1, y + R) && !near; yy++) {
      for (let xx = Math.max(0, x - R); xx <= Math.min(w - 1, x + R); xx++) if (key[yy * w + xx]) { near = true; break; }
    }
    if (!near) lit[i] = 0;
  }
  return lit;
}
/** What a baked figure holds on the graphics chip (its one shared source). */
export function _figBytes(arr) {
  const src = arr && arr[0] && arr[0].source;
  return src ? Math.round((src.pixelWidth || src.width || 0) * (src.pixelHeight || src.height || 0) * 4) : 0;
}
/* ═══ v2.3.2760: DID A LOOPING ANIMATION PASS FRAME `target` SINCE LAST FRAME? ═══
   The harvest strike effects (the chop's bite, the pick's clink and debris)
   used to test `cur === target && last !== target`.  That was fine while the
   loops ran on a clock; since the swing follows the HAND, a quick stroke can
   step straight over the strike frame (8 -> 10), and the blow would land in
   silence.  Loops only run forward (gesturePose01 never rewinds), so a smaller
   `cur` means it wrapped past the end.
   last === -1: first frame of a harvest -- fire only if we start ON it.
   last === -2: the loop was re-seeded (the wind-up's clock handed over to the
   gesture at `ready`, which snaps to the ready pose) -- never a blow. */
export function _crossedFrame(last, cur, target) {
  if (last === -2) return false;
  if (last < 0) return cur === target;
  if (cur === last) return false;
  if (cur > last) return last < target && cur >= target;
  return last < target || cur >= target;
}
