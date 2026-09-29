/* ═══ v2.3.2937: THE GROUND STUDIO'S PROMPTS ═══
 *
 * One prompt per swatch in the catalog (../world/core/ground.js), built from
 * three things and nothing else:
 *   - what the ground IS: the swatch's brief, from the plan;
 *   - the words every picture shares: the HD pixel art paragraph and the
 *     quiet-ground rule (../style/bible.js, docs/WORLD-BIBLE.md §6);
 *   - the one picture attached to every chat: the style key.  v2.3.2939: not
 *     the bro as well -- he is simpler pixel art than the world, and ChatGPT
 *     copies what it sees, so his size is given in words instead.
 * So two chats about the same swatch ask exactly the same question, and a
 * change to the style bible changes every prompt at once.
 */
import { PIXEL, HD_STYLE, QUIET_GROUND, KEY_MATCH, personScale } from '../style/bible.js';

/* Swatches that ARE a surface -- a street, planks, gravel -- rather than
   ground things sit on.  The quiet rule still holds; "no paths" would not. */
const SURFACES = new Set(['street', 'boardwalk', 'plaza', 'road', 'gravel', 'lava']);
const QUIET_SURFACE = 'The texture is quiet: mostly the base tones, with small details covering no more than about a tenth of the area. The whole square is this one surface, edge to edge: no grass verge, no objects and no water.';

/* A person against one tile: 106 game px against 512 art px x 1.5. */
export function scaleLine() {
  return `${personScale(PIXEL.groundTile * PIXEL.gamePxPerArtPx)}, so draw every blade, pebble and plank at that size`;
}

export function promptFor(entry) {
  const quiet = SURFACES.has(entry.id) ? QUIET_SURFACE : QUIET_GROUND;
  return [
    `A seamless, tileable square texture of ground for BroTown, a top-down 2D action RPG, seen from directly above: ${entry.brief}. ${quiet} Every edge must continue seamlessly into the opposite edge. No border, no text and no shadows cast on it.`,
    `Style: ${HD_STYLE}`,
    `${KEY_MATCH} Scale: ${scaleLine()}.`,
  ].join('\n\n');
}
