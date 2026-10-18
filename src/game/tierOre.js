/* ═══ v2.3.3345: EACH METAL ITS OWN ROCK ═══
 *
 * After the five trees (game/tierTrees.js), the owner's five ore rocks: one
 * picture a metal, the same in every land, its SIZE saying the tier ("the
 * beginner tier scale up in physical size to the final tier where you have
 * huge fish, ore, and trees at the end") -- copper a rock half a bro tall,
 * then iron, black steel, titanium, and obsidian a boulder taller than you.
 * Before, every tier was the one painted copper vein with its colours mapped
 * (tools/make_tier_art.py) and 15% more height a ten levels.
 *
 * The pictures are the owner's (ChatGPT, one sheet on green), cut by
 * tools/world/add-ore-art.mjs into public/sprites/ore/ore-*.png and
 * src/data/oreArt.js.  This file says where a rock stands and how big it is,
 * in world px, for everything that asks: the renderer (effectsRenderer), the
 * walk test (BroTown nodeBlockEllipse), the bar under it and the label over
 * it.  No Pixi here.  docs/specs/tier-ore.md.
 *
 * WHERE A ROCK STANDS is decided by the miner, who works it from behind:
 * seated at MINE_SEAT_DX/DY (data/constants.js: 7 px west, 86 north of the
 * node's point) and drawn 8 px higher (entityRenderer), his swing's sheet has
 * a rock of its own baked in under his boots, which the real rock -- drawn
 * over him while he mines -- has to hide.  Measured through the body sprite's
 * own transform (mp-tierore): that baked rock lies 27 to 59 px north of the
 * node's point, 13 px west to 18 east of it at rest, its chips flying 27 west
 * to 35 east at the blow.  The old copper vein covered two thirds of it (its
 * base stood 35 px north, and the rest poked out under it).  So:
 *   - every rock's BASE stands ORE_BASE_DY (22) north of the node's point,
 *     its foot's middle on the point's x -- each of the five then lies over
 *     all of the baked rock at rest, and over 98% (copper) to all of it at
 *     the blow;
 *   - a rock is never drawn higher than ORE_TOP_MAX_UP (110) over the point:
 *     the miner's head is 114 to 136 px up, his shoulders ~111, so the two
 *     biggest stand further south instead and he keeps his head and shoulders
 *     over them -- the old vein hid him to the neck from black steel on.
 */
import { ORE_ART, ORE_ART_V } from '../data/oreArt.js';   /* relative, so a node test (mp-tierore) can import this file */

/* 2 picture px a game px (public/tools/style/bible.js PIXEL.gamePxPerArtPx) */
export const ORE_PX = 0.5;
export const ORE_BASE_DY = 22;
export const ORE_TOP_MAX_UP = 110;

const LVLS = Object.keys(ORE_ART).map(Number).sort((a, b) => a - b);

/** The tier whose picture a vein of this gathering tier (a node's gatherLvl)
 *  is drawn with: its own; a tier between two takes the one below it, and a
 *  tier past the five (the tables go to 96, nothing grows there yet) the
 *  biggest. */
export function oreArtLevelFor(lvl) {
  const L = Number(lvl) || 1;
  let pick = LVLS[0];
  for (const k of LVLS) if (k <= L) pick = k;
  return pick;
}
export const oreArtFor = (lvl) => ORE_ART[oreArtLevelFor(lvl)];

/** Every tier with a picture, and each one's address: a new cut is a new
 *  address (?v=), so a phone never keeps an old rock. */
export function oreArtSources() {
  return LVLS.map((lvl) => ({ lvl, url: `${ORE_ART[lvl].url}?v=${encodeURIComponent(ORE_ART_V)}` }));
}

/** Where a vein's rock stands, in world px.  `footY` is its base (the depth
 *  line), `anchorX/Y` put the sprite on the node's point with its base where
 *  it belongs (anchorY past 1 when the base is north of the point). */
export function oreGeom(node) {
  const art = oreArtFor(node && node.gatherLvl);
  const height = art.foot[1] * ORE_PX;
  const footX = node.x;
  const footY = Math.max(node.y - ORE_BASE_DY, node.y - ORE_TOP_MAX_UP + height);
  const left = footX - art.foot[0] * ORE_PX;
  const top = footY - height;
  return {
    art, footX, footY, top, left, height,
    right: left + art.w * ORE_PX,
    bottom: top + art.h * ORE_PX,
    anchorX: art.foot[0] / art.w,
    anchorY: (art.foot[1] + (node.y - footY) / ORE_PX) / art.h,
  };
}

/** The rock you cannot walk into: its whole drawn body, as the owner asked
 *  for ore since v2.3.1500 ("the player unable to walk over ore") -- an
 *  ellipse in its box, the way BroTown's NODE_ART cut the old vein's. */
export function oreBlockEllipse(node) {
  const g = oreGeom(node);
  return { x: (g.left + g.right) / 2, y: (g.top + g.footY) / 2, rx: (g.right - g.left) / 2, ry: (g.footY - g.top) / 2 };
}
