/* ═══ v2.3.6209: A DYING MONSTER'S SHADOW HANGS FROM ITS OWN FRAME'S FEET (card EN) ═══
 *
 * The owner, 2026-11-27, playing the world on an iPhone: "The skeletons shadow
 * during death animation (of mummy - skeleton is second phase) is far too low".
 *
 * THE CAUSE.  A monster's shadow hangs from a ground point (lightfx/casters.js):
 * where its body sprite is anchored -- the bottom of its 256 px cell -- less the
 * empty rows its look stands above that bottom AT REST (MONSTER_VARIANTS
 * `feetRow`, v2.3.4493).  Right for every walk, stand and attack strip: they are
 * cut with the feet on the cell's bottom rows.  A DEATH strip is not: it is cut at
 * its own scale and place (deathScalePx, deathOffsetY), and the skeleton's was
 * pre-shrunk into the middle of its canvas -- its first frame's figure ends on
 * row 126 of 256, so 130 empty rows (about 110 px on screen) hung between its
 * feet and the point its shadow was cast from, and the shadow, cast along the
 * sun from that point, lay far below it.  The water frog's death (its frame 0
 * ends on row 197, the walk's feetRow said 232) was the same, less far.
 *
 * THE RULE.  While a body shows a frame of a death strip (the renderer shows it
 * through showDeathFrame, which marks it), its ground is that FRAME's own: the row under its lowest
 * painted pixel (`__btFoot`, read by the strip's packer in the scan it already
 * makes to crop the frame: trimRules.js trimCellOf `by`; no new read, nothing
 * kept but a number a frame, freed with its texture).  Never below the sprite's
 * anchor (a slime's death is anchored on its own base row, and its splat spreads
 * under it).  Walking, standing and attacking frames keep the rule they had.
 *
 * No Pixi and no import: node tests it (tools/guards/frame-foot.test.mjs).
 */

/** The renderer's death branches show a death frame through this: the texture set
 *  (written only on a change: a structural write is not every frame's) and marked. */
export function showDeathFrame(sprite, tex) {
  if (!sprite || !tex) return;
  if (sprite.texture !== tex) sprite.texture = tex;
  sprite._deathTex = tex;
}

/** How far above its anchor a dying body's frame meets the ground, in the sprite's
 *  parent's px; -1 when the body is not showing a marked death frame or the frame's
 *  foot is not known (the caller keeps its own rule). */
export function deathGroundLift(sprite) {
  const t = sprite && sprite.texture;
  if (!t || sprite._deathTex !== t) return -1;
  const foot = t.__btFoot;
  const oh = t.orig ? t.orig.height : 0;
  if (!(foot > 0) || !(oh > 0)) return -1;
  const ay = sprite.anchor ? sprite.anchor.y : 1;
  const rows = ay * oh - foot;
  return rows > 0 ? rows * Math.abs(sprite.scale ? sprite.scale.y : 1) : 0;
}
