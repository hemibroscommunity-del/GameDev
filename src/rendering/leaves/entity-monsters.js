/* ═══ v2.3.6200: monsters's leaves from entityRenderer.js (card EN, grand plan 5.5, M's line 8) ═══
 *
 * Top-level functions of src/rendering/systems/entityRenderer.js that read
 * no `this` and reach no module state, moved VERBATIM (only `export` and
 * the imports are new), with the constants they read; imported back by the
 * same names.  A leaf imports nothing from the renderers (four-lines'
 * IMPORT_CYCLE_FILES has no room).  The census: part 5 of
 * docs/plan/census/M-tables.md (tools/dev/render-code-census.mjs).
 */
import { MONSTER_VARIANTS } from '../../data/monsterVariants.js';
import { Sprite } from 'pixi.js';
import { WHIRL_GLOW_ALPHA, whirlTintAt } from '../../game/whirlCatch.js';
import { fillBatchOn } from '../fillBatch.js';
import { getRecoloredFrame, hasRecoloredState } from '../monsterRecolor.js';
import { getFrame as getSlimeBaseFrame } from '../slimeSprites.js';

/* ── v2.3.6200: level 0 ── */
/* v2.3.1534: one place that decides whether a slime draws from the shared
   sheet or from its variant's RECOLOURED copy.  A variant with `recolor` gets
   the retinted texture and NO tint -- the pixels are already the right colour,
   and multiplying them again by the fallback green would undo it.  Until the
   recolour has finished building (or if it failed), both fall back to exactly
   what shipped before: base sheet + multiplicative tint. */
export function getSlimeFrame(state, frameIdx, variant) {
  if (variant && variant.recolor && hasRecoloredState(variant, state)) {
    const t = getRecoloredFrame(variant, state, frameIdx);
    if (t) return t;
  }
  return getSlimeBaseFrame(state, frameIdx);
}
export function slimeTintFor(variant, state) {
  if (variant && variant.recolor && hasRecoloredState(variant, state)) return 0xffffff;
  return (variant && variant.tint) || 0xffffff;
}
export function getMonsterSize(archetype) {
  /* Slime/fodder stays small (renders as a 50-px sprite, the 8-px
     circle is the procedural fallback / hitbox anchor).  Snowman
     stays at 13 because its sprite anchor (spriteBody.y = size)
     pins the 64-px sprite's feet to the circle's bottom edge.
     Every other archetype is a bare procedural circle, so bump the
     radius to 32 (64-px diameter) per the user's "64x64 for non-
     slime monsters" call-out. */
  if (archetype === 'fodder' || MONSTER_VARIANTS[archetype]) return 8;
  if (archetype === 'snowman') return 13;
  return 32;
}
export function getMonsterColor(archetype) {
  const colors = {
    fodder: 0x3dd497, swarm: 0xf5c542, brute: 0xff5e6c,
    sentinel: 0x5b52ff, volatile: 0xea580c, stalker: 0x8890b8,
    hexer: 0xa78bfa, snowman: 0xb0d8f0,
  };
  return colors[archetype] || 0x3dd497;
}
export function cssColorToHex(css) {
  if (typeof css !== 'string') return 0x000000;
  return parseInt(css.replace('#', ''), 16) || 0x000000;
}
export const _HIT_FLASH = 0xff8080;
export function _whirlGlow(display, f) {
  const sb = display._spriteBody;
  let g = display._whirlGlow;
  if (!(f >= 0) || !sb || !sb.visible || !sb.texture || sb.parent !== display || !fillBatchOn()) {
    if (g && g.visible) g.visible = false;
    return;
  }
  if (!g) {
    g = new Sprite(sb.texture);
    g._btFill = true;
    g._noSharp = true;
    g.label = 'whirlGlow';
    g.visible = false;
    display.addChildAt(g, display.getChildIndex(sb) + 1);
    display._whirlGlow = g;
  }
  /* right over the body, as it is shown: a branch that swaps the body for a
     new sprite puts it last, over this one */
  if (!g.visible) {
    const bi = display.getChildIndex(sb);
    if (display.children[bi + 1] !== g) display.setChildIndex(g, Math.min(display.children.length - 1, display.getChildIndex(g) < bi ? bi : bi + 1));
  }
  if (g.texture !== sb.texture) g.texture = sb.texture;
  if (g.anchor.x !== sb.anchor.x || g.anchor.y !== sb.anchor.y) g.anchor.set(sb.anchor.x, sb.anchor.y);
  if (g.x !== sb.x || g.y !== sb.y) g.position.set(sb.x, sb.y);
  if (g.scale.x !== sb.scale.x || g.scale.y !== sb.scale.y) g.scale.set(sb.scale.x, sb.scale.y);
  if (g.rotation !== sb.rotation) g.rotation = sb.rotation;
  if (g.skew.x !== sb.skew.x || g.skew.y !== sb.skew.y) g.skew.set(sb.skew.x, sb.skew.y);
  if (g.pivot.x !== sb.pivot.x || g.pivot.y !== sb.pivot.y) g.pivot.set(sb.pivot.x, sb.pivot.y);
  const tint = whirlTintAt(f);
  if (g.tint !== tint) g.tint = tint;
  const al = WHIRL_GLOW_ALPHA * sb.alpha * (sb.tint === _HIT_FLASH ? 0.35 : 1);
  if (g.alpha !== al) g.alpha = al;
  if (!g.visible) g.visible = true;
}
