/* ═══ v2.3.6200: townsfolk's leaves from entityRenderer.js (card EN, grand plan 5.5, M's line 8) ═══
 *
 * Top-level functions of src/rendering/systems/entityRenderer.js that read
 * no `this` and reach no module state, moved VERBATIM (only `export` and
 * the imports are new), with the constants they read; imported back by the
 * same names.  A leaf imports nothing from the renderers (four-lines'
 * IMPORT_CYCLE_FILES has no room).  The census: part 5 of
 * docs/plan/census/M-tables.md (tools/dev/render-code-census.mjs).
 */
import { NPC_DIRS_8, NPC_SPRITE_SCALE, QUEST_BADGE_R } from '../tables/townsfolk.js';
import { PLAYER_SIZE_MULT } from '../tables/look.js';

/* ── v2.3.6200: level 0 ── */
export const NPC_BRO_MULT = PLAYER_SIZE_MULT;
export const NPC_SCALE_MULT = Object.assign(Object.create(null), {
  '/sprites/npc/mayor-bro.webp': NPC_BRO_MULT * 1.10,
  '/sprites/npc/blacksmith-bro.webp': NPC_BRO_MULT,
  '/sprites/npc/shopkeeper-bro-walk-south.webp': NPC_BRO_MULT,
  '/sprites/npc/cardsharp-bro-walk-south.webp': NPC_BRO_MULT,
  '/sprites/npc/woodworker-bro.webp': NPC_BRO_MULT,
  '/sprites/npc/farmer-bro.webp': NPC_BRO_MULT,
  '/sprites/npc/beastmaster-bro.webp': NPC_BRO_MULT,
  '/sprites/npc/lil-bro-walk-south.webp': NPC_BRO_MULT,
  /* v2.3.3833: the new cast (docs/specs/npc-cast.md), each a bro's scale; Bean
     a child, photographed at 0.8 as Lil Bro is */
  '/sprites/npc/sterling.webp': NPC_BRO_MULT,
  '/sprites/npc/slim.webp': NPC_BRO_MULT,
  '/sprites/npc/chef-blaze.webp': NPC_BRO_MULT,
  '/sprites/npc/glint.webp': NPC_BRO_MULT,
  '/sprites/npc/postmaster-pete.webp': NPC_BRO_MULT,
  '/sprites/npc/deed-dave.webp': NPC_BRO_MULT,
  '/sprites/npc/benny.webp': NPC_BRO_MULT,
  '/sprites/npc/guildmaster-gary.webp': NPC_BRO_MULT,
  '/sprites/npc/sheriff-buck.webp': NPC_BRO_MULT,
  '/sprites/npc/gavel-greg.webp': NPC_BRO_MULT,
  '/sprites/npc/old-man-reel.webp': NPC_BRO_MULT,
  '/sprites/npc/bean.webp': NPC_BRO_MULT,
  '/sprites/npc/tourist-terry.webp': NPC_BRO_MULT,
});
export const npcSpriteScale = (src) => NPC_SPRITE_SCALE * (NPC_SCALE_MULT[src] || 1);
/* v2.3.3580: how big his figure is painted in his cell, a grown bro's 1
   (NPC_DATA `figureSize`: Lil Bro 0.8) */
export const npcFigureSize = (npc) => (npc && npc.figureSize > 0 ? npc.figureSize : 1);
/* v2.3.3809: a townsperson drawn live -- his body's size on the screen, world
   px (the probe's; mp-wheelfolk sizes him against a player) */
export function _folkBodyPx(folk, k) {
  const b = folk && folk._spriteBody;
  if (!b || !b.texture) return 0;
  return Math.abs(b.texture[k] * (k === 'height' ? b.scale.y : b.scale.x) * folk.scale.y);
}
export function npcDirFromDelta(dx, dy) {
  const a = Math.atan2(dy, dx);                    /* -pi..pi, +y is down */
  const oct = Math.round(a / (Math.PI / 4));       /* -4..4 */
  return NPC_DIRS_8[((oct % 8) + 8) % 8];
}
export function npcStandFrame(npc) {
  const n = npc && npc.walk && npc.walk.stand;
  return Number.isInteger(n) && n >= 0 ? n : 0;
}
/** Three concentric rings, drawn outside in.  `fill` carries the state
 *  (gold = quest to offer, green = ready to turn in). */
export function _drawQuestBadge(g, fill, check) {
  g.clear();
  /* Dark hairline first: without it the white ring dissolves into the town's
     pale cobblestones, which is the exact background the owner reported the
     marker disappearing against. */
  g.circle(0, 0, QUEST_BADGE_R);
  g.fill({ color: 0x1A1207, alpha: 0.9 });
  /* The thick white ring the owner asked for. */
  g.circle(0, 0, QUEST_BADGE_R - 2);
  g.fill({ color: 0xFFFFFF });
  g.circle(0, 0, QUEST_BADGE_R - 5.5);
  g.fill({ color: fill });
  /* ═══ v2.3.3047: THE CHECK, DRAWN ═══
     Owner: "a green checkmark above his head (not emoji)".  Two strokes of
     the same path -- a dark one under, a white one over -- so it holds on the
     green the way the glyphs' dark-on-gold does, at any size, with no font. */
  if (check) {
    g.moveTo(-5.5, 0.5).lineTo(-1.5, 4.5).lineTo(6, -4.5);
    g.stroke({ width: 5, color: 0x1A1207, alpha: 0.85, cap: 'round', join: 'round' });
    g.moveTo(-5.5, 0.5).lineTo(-1.5, 4.5).lineTo(6, -4.5);
    g.stroke({ width: 3, color: 0xFFFFFF, cap: 'round', join: 'round' });
  }
}
