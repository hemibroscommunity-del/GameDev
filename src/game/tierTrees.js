/* ═══ v2.3.3343: EACH WOOD ITS OWN TREE ═══
 *
 * The owner, 2026-10-18, of the resources: every tier grows in every land,
 * "the log art (in terms of color to represent the type of wood) would need to
 * be the same across all 8 lands", and a land is to show by effects drawn in
 * code, not by another tree.  So a wood's tree is ONE picture everywhere: its
 * shape and its SIZE say the tier (1.5, 2, 2.5, 3 and 4 people tall), its bark
 * the colour of its log icon -- pine, a willow for softwood, a gnarled old
 * hardwood, a cedar, a huge autumn maple.  Before, every tier was the one
 * painted pine with a colour wash and 15% more height a stretch.
 *
 * The pictures are the owner's (ChatGPT, from that day's prompts), cut by
 * tools/world/add-tree-art.mjs into public/sprites/trees/wood-*.png and
 * src/data/treeArt.js.  This file says where a tree stands and how big it is,
 * in world px, for everything that asks: the renderer (effectsRenderer), the
 * walk test (BroTown nodeBlockEllipse), the lumberjack's place
 * (chopStandInSpot), the bar and the label over the crown.  No Pixi here.
 * docs/specs/tier-trees.md.
 */
import { TREE_ART, TREE_ART_V } from '@/data/treeArt.js';

/* 2 picture px a game px (public/tools/style/bible.js PIXEL.gamePxPerArtPx) */
export const TREE_PX = 0.5;
/* Where the trunk's foot stands: this far NORTH of the node's point -- where
   the old pine's drawn base stood (its 168 px frame met the ground at 0.839 of
   its height, effectsRenderer NODE_ART_BASE).  So everything worked out from
   the node's point keeps the meaning it had: the ground the bake keeps clear
   round it, the lumberjack planted at node.y + 6 in front of the trunk, the
   reach test, the depth line. */
export const TREE_FOOT_DY = 27;

const LVLS = Object.keys(TREE_ART).map(Number).sort((a, b) => a - b);

/** The tier whose picture a tree of this gathering tier (a node's gatherLvl)
 *  is drawn with: its own; a tier between two takes the one below it, and a
 *  tier past the five (the tables go to 96, nothing grows there yet) the
 *  biggest. */
export function treeArtLevelFor(lvl) {
  const L = Number(lvl) || 1;
  let pick = LVLS[0];
  for (const k of LVLS) if (k <= L) pick = k;
  return pick;
}
export const treeArtFor = (lvl) => TREE_ART[treeArtLevelFor(lvl)];

/** Every tier with a picture, and each one's address: a new cut is a new
 *  address (?v=), so a phone never keeps an old tree. */
export function treeArtSources() {
  return LVLS.map((lvl) => ({ lvl, url: `${TREE_ART[lvl].url}?v=${encodeURIComponent(TREE_ART_V)}` }));
}

/** Where a tree node's picture stands, in world px.  `anchorX/Y` put the
 *  sprite on the node's point with its foot TREE_FOOT_DY above it (anchorY is
 *  past 1: the picture ends above the point it is placed on). */
export function treeGeom(node) {
  const art = treeArtFor(node && node.gatherLvl);
  const footX = node.x, footY = node.y - TREE_FOOT_DY;
  const left = footX - art.foot[0] * TREE_PX;
  const top = footY - art.foot[1] * TREE_PX;
  return {
    art, footX, footY, top, left,
    right: left + art.w * TREE_PX,
    bottom: top + art.h * TREE_PX,
    height: art.foot[1] * TREE_PX,
    trunk: art.trunk * TREE_PX,
    anchorX: art.foot[0] / art.w,
    anchorY: (art.foot[1] + TREE_FOOT_DY / TREE_PX) / art.h,
  };
}

/* Where the name label and the harvest bar hang: over the crown, but never
   more than TREE_MARK_MAX_UP world px above the foot.  The maple's crown tops
   out 424 px up, and on an upright phone with the woodcutter at its trunk
   (the camera on him) a bar over it lay under the pinned quest card -- you
   could not see your chop (mp-tiertrees' picture).  So a tree taller than
   that wears them in its crown's upper part; the rest, as ever, over it. */
export const TREE_MARK_MAX_UP = 300;
export function treeMarkY(g) {
  return Math.max(g.top, g.footY - TREE_MARK_MAX_UP);
}

/** The trunk you cannot walk through: an ellipse at its foot, as wide as the
 *  trunk just above its roots and a third as deep (the old pine's was 31 x 8:
 *  BroTown NODE_ART's trunk box).  The crown stays walk-under. */
export function treeTrunkEllipse(node) {
  const g = treeGeom(node);
  const rx = Math.max(5, g.trunk);
  const ry = Math.max(4, Math.min(10, rx * 0.3));
  return { x: g.footX, y: g.footY - ry, rx, ry };
}

/* How far the lumberjack's middle stands from the trunk's.  At his strike the
   blade's middle is CHOP_REACH world px out from him (effectsRenderer
   CHOP_OFFSET's note: 94.5 art px at CHOP_STANDIN_H), and the old pine's 44
   put it 15 px past the trunk's middle.  So he stands CHOP_REACH off, less 60%
   of the trunk's half-width (15 at most): the blade bites inside the trunk
   whatever its size -- 44 for a broad one, as before, and 55 for the slim pine,
   whose trunk the old 44 would have swung through. */
export const CHOP_REACH = 59;
export function treeChopOffset(node) {
  return CHOP_REACH - Math.min(15, treeGeom(node).trunk * 0.6);
}

/* ═══ SEEN THROUGH WHEN YOU STAND BEHIND ONE ═══
   A tree is drawn over anyone behind its foot (v2.3.1500, the owner's, kept
   by the depth pass since v2.3.2635).  A four-person maple would hide you
   whole, so a tree whose crown covers your body while you stand behind its
   foot eases to TREE_SEE_ALPHA -- still in front of you, but you can see
   yourself: the scenery trees' rule and numbers (wheelObjects.js _seeThrough,
   behind `?fade` there).  `?treefade=0` keeps them solid. */
export const TREE_SEE_ALPHA = 0.42, TREE_SEE_MS = 110;
export const TREE_FADE = (() => {
  try { return !/(^|[?&])treefade=0(&|$)/.test(window.location.search || ''); } catch (e) { return true; }
})();
/** True when someone whose boots are at (px, fy) and whose body is bodyH tall
 *  stands behind this tree with its crown over them. */
export function behindTree(g, px, fy, bodyH) {
  const crownHalf = (g.right - g.left) * 0.4;
  return fy < g.footY - 4 && fy > g.top + 20
    && Math.abs(px - g.footX) < crownHalf + 14
    && fy - bodyH < g.footY - g.height * 0.35;
}
