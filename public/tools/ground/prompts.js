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
import { PIXEL, HD_STYLE, QUIET_GROUND, NO_DIRECTION, PLANK_BOARDS, KEY_MATCH, EDGE_MATCH, EDGE_BACKGROUND, personScale } from '../style/bible.js';

/* Swatches that ARE a surface -- a street, planks, gravel -- rather than
   ground things sit on.  The quiet rule still holds; "no paths" would not. */
const SURFACES = new Set(['street', 'boardwalk', 'plaza', 'road', 'gravel', 'lava']);
const QUIET_SURFACE = 'The texture is quiet and clean: broad, smooth areas of the base tones, with small details covering no more than about a tenth of the area, and no noise, speckle or grain. The whole square is this one surface, edge to edge: no grass verge, no objects and no water.';

/* A person against one tile: 106 game px against 512 art px x 1.5. */
export function scaleLine() {
  return `${personScale(PIXEL.groundTile * PIXEL.gamePxPerArtPx)}, so draw every blade, pebble and board at that size`;
}

/* v2.3.2944: every swatch says NO_DIRECTION (style/bible.js) -- the owner's
   rule, after wagon ruts tiled sideways down a north-south Main Street.
   v2.3.2949: all but the boardwalk, whose boards the game lays itself
   (`laid`), and which says PLANK_BOARDS instead. */
export function promptFor(entry) {
  const quiet = SURFACES.has(entry.id) ? QUIET_SURFACE : QUIET_GROUND;
  const way = entry.laid === 'planks' ? PLANK_BOARDS : NO_DIRECTION;
  return [
    `A seamless, tileable square texture of ground for BroTown, a top-down 2D action RPG, seen from directly above: ${entry.brief}. ${quiet} ${way} Every edge must continue seamlessly into the opposite edge. No border, no text and no shadows cast on it.`,
    `Style: ${HD_STYLE}`,
    entry.laid === 'planks'
      ? `${KEY_MATCH} Scale: about twelve to sixteen boards from top to bottom, drawn big and clear; the game makes each one about an eighth as wide as a person is tall.`
      : `${KEY_MATCH} Scale: ${scaleLine()}.`,
  ].join('\n\n');
}

/* ═══ v2.3.2947: EDGE PIECES ═══
   Owner: "There needs to be specific and additional prompts for when two
   swatches have a contact area to make a smoother transition."  207 pairs
   of grounds touch on the Wheel -- the road alone meets 45 -- so the extra
   prompt is one per GROUND, not per pair: its own loose pieces, which the
   game scatters wherever it lies over another ground (world/core/ground.js,
   edgeRecipe), so one picture serves every neighbour it has.  Pieces, not a
   picture of an edge: an edge in a picture runs one way, and every picture
   is laid the same way up (NO_DIRECTION); the game draws the edge's shape.
   v2.3.2948: put away (the owner saw no difference; world/core/ground.js,
   EDGE_PIECES): these prompts show in the studio only with ?edgepieces. */
const PIECES = {
  grass: ['tufts and small clumps of its grass, with a few loose blades, and the odd small flower if it has them', 'grass'],
  moss: ['small cushions and clumps of its moss', 'moss'],
  snow: ['small lumps, crumbs and thin patches of its snow', 'snow'],
  ice: ['small shards and thin broken patches of its ice', 'ice'],
  sand: ['small drifts and scattered patches of its sand', 'sand'],
  ash: ['small drifts and scattered patches of its ash', 'ash'],
  earth: ['small clods and patches of its earth, with a few small stones', 'earth'],
  rock: ['small stones, chips and flakes of its rock', 'rock'],
};
/* Which swatches have edge pieces: those that ever lie over another. */
export function hasEdgePieces(entry) { return !!(entry && PIECES[entry.kind]); }
export function edgePromptFor(entry) {
  const [what, noun] = PIECES[entry.kind] || ['small loose pieces of it', 'ground'];
  return [
    `Loose EDGE PIECES of one ground for BroTown, a top-down 2D action RPG, seen from directly above. The ground: ${entry.brief}. Draw ${what}: about forty to sixty separate small pieces, each about the size of a person's hand or head, scattered evenly over the whole picture with plain background between them. No piece touches another or the edge of the picture. The game lays these where this ground ends and another begins, so they must look exactly like this ground's own ${noun}.`,
    `${EDGE_BACKGROUND} ${NO_DIRECTION} No text and no border.`,
    `Style: ${HD_STYLE}`,
    `${EDGE_MATCH} Scale: ${scaleLine()}.`,
  ].join('\n\n');
}
