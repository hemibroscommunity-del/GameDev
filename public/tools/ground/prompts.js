/* ═══ v2.3.2937: THE GROUND STUDIO'S PROMPTS ═══
 *
 * One prompt per swatch in the catalog (../world/core/ground.js), built from
 * three things and nothing else:
 *   - what the ground IS: the swatch's brief, from the plan;
 *   - the words every picture shares: the HD pixel art paragraph and the
 *     quiet-ground rule (../style/bible.js, docs/WORLD-BIBLE.md §6);
 *   - the two pictures attached to every chat: the style key, and the bro
 *     for scale.
 * So two chats about the same swatch ask exactly the same question, and a
 * change to the style bible changes every prompt at once.
 */
import { PIXEL, HD_STYLE, QUIET_GROUND } from '../style/bible.js';

/* Swatches that ARE a surface -- a street, planks, gravel -- rather than
   ground things sit on.  The quiet rule still holds; "no paths" would not. */
const SURFACES = new Set(['street', 'boardwalk', 'plaza', 'road', 'gravel', 'lava']);
const QUIET_SURFACE = 'The texture is quiet: mostly the base tones, with small details covering no more than about a tenth of the area. The whole square is this one surface, edge to edge: no grass verge, no objects and no water.';

/* The bro against one tile: 106 game px against 512 art px x 1.5. */
export function scaleLine() {
  const across = PIXEL.groundTile * PIXEL.gamePxPerArtPx;
  const n = Math.round(across / 106);
  return `draw at the hero's scale: he would be about one ${n === 7 ? 'seventh' : n === 8 ? 'eighth' : n === 6 ? 'sixth' : `${n}th`} as tall as this picture`;
}

export function promptFor(entry) {
  const quiet = SURFACES.has(entry.id) ? QUIET_SURFACE : QUIET_GROUND;
  return [
    `A seamless, tileable square texture of ground for BroTown, a top-down 2D action RPG, seen from directly above: ${entry.brief}. ${quiet} Every edge must continue seamlessly into the opposite edge. No border, no text and no shadows cast on it.`,
    `Style: ${HD_STYLE}`,
    `Attached are the game's style key and our hero. Match the style key's pixel size, colours and shading exactly, and ${scaleLine()}.`,
  ].join('\n\n');
}
