/* ═══ v2.3.2935: BROTOWN HD PIXEL ART — the numbers and words every picture shares ═══
 *
 * Owner, 2026-09-29, after comparing the looks: "I think HD pixel art is the
 * direction I want to go.  What should the rules be around generating art
 * like that?"  And, choosing the grid: "Yes 1.5 grid".
 *
 * One place for what every art tool asks for and does: the Style Lab
 * (candidates.js), and the ground and object tools that follow.  The World
 * Builder's square prompts (../world/plan.js, `style`) say the same things
 * phrased for a map square -- keep the two in step.  The rules, and why each
 * one exists, are docs/WORLD-BIBLE.md §6.
 *
 * Words only get ChatGPT close.  What a prompt cannot hold, the pipeline does
 * to every picture afterwards (process.js): the grid (`PIXEL.gamePxPerArtPx`),
 * one frozen palette, hard edges, no stray single pixels.  So these numbers
 * are the pipeline's settings, not suggestions.
 *
 * v2.3.2939, owner: "I don't really want my character to be the reference
 * image because I'm wanting the world to be high definition pixel art
 * (especially material-aware texturing) and my character is simple pixel
 * art."  ChatGPT copies what it sees: an attached bro pulled every picture
 * toward his chunkier, flatter pixels.  So the STYLE KEY is the only picture
 * attached for style (KEY_MATCH), sizes are given in words (personScale), and
 * every prompt asks for each material drawn as itself (MATERIALS).  The bro
 * is still what everything is JUDGED beside, at game size, in the previews.
 */

export const PIXEL = {
  /* Game px per pixel of a picture ("art pixel").  v2.3.2942: 0.5 -- every
     picture is kept at 2 px per game px, about a phone's own sharpness (an
     iPhone 13-15 shows 2.47 device px per game px), so it is never blown up.
     Owner, on the ground at the old 1.5: "soft and gritty at the same time
     … I know the image is being blown up.  Maybe if you just made the tiles
     scale smaller before you apply them in the world?"  Shrinking a ChatGPT
     picture onto a 1.5 game px grid and stretching it back made each of its
     pixels ~3.7 phone pixels: blurred by the shrink, blocky from the
     stretch, speckled by the palette.  The bro's own pixels are about 2
     game px, so the world is now much finer than he is.  (1.5, "Yes 1.5
     grid", v2.3.2935 until v2.3.2942.)  NOT the world plan's unit: plan.js
     `worldPxPerArtPx` stays 1.5 -- three picture px to a plan px. */
  gamePxPerArtPx: 0.5,
  /* Colours in the one palette the whole world shares, the reserved effect
     colours (night, water, fire) included.  Made once from the style key,
     then frozen: every picture is moved onto it.
     v2.3.2940: 64 -> 128.  Owner: "Yes do 128."  With 8 kept for the
     effects, 64 left 56 colours for eight lands and the town: too few for
     material-aware texturing (the Poison Forest's greens would merge with
     the Verdant Wilds', metal would lose its shine steps).  Still ONE shared
     palette, so the look stays one world. */
  palette: 128,
  /* A ground swatch, in picture px: 1024, covering 512 game px -- about a
     phone screen's width and half its height.  v2.3.2942 (the owner's idea
     above): 768 game px until then, which is what blew ChatGPT's picture
     up; at 512 its 1254 px shrink a little to 1024 and are shown at about
     their own size. */
  groundTile: 1024,
  /* v2.3.2939: a person, crown to foot, in game px -- the bro is 105.7
     (worldViewport.js).  Sizes are said in words from this, never shown by
     attaching his picture. */
  personGamePx: 106,
};

/* v2.3.2939: material-aware texturing, the owner's "especially".  Every
   material is recognisable from its own texture and the SHAPE of its
   highlights, not from colour alone.  Highlights stay clusters of two or
   more pixels: the pipeline's despeckle (process.js) removes single ones.
   Water is not listed: the game draws it (docs/WORLD-BIBLE.md §11).
   v2.3.2941, owner, on the first ground at game size: "too gritty and low
   resolution compared to the character."  This line asked for "earth with
   grit", and got it; texture now comes from clear shapes, never noise.
   v2.3.2944: sand in soft drifts, not "wind ripples" -- ripples all run one
   way, and a ground swatch must not (NO_DIRECTION below). */
export const MATERIALS = 'Every material is drawn as itself, so it can be told apart at a glance by its own texture and the shape of its highlights: grass in soft clumps of blades, packed earth with a few small stones, stone with hard-edged facets, chips and cracks, wood with grain lines and knots, metal with small, sharp, bright highlights, snow and ice in cool blues with crisp edges, and sand in soft, fine drifts. Texture comes from a few clear shapes and soft shading, never from noise, speckle or grain. Highlights are small clusters of pixels, never single stray ones.';

/* The style paragraph every picture's prompt carries. */
export const HD_STYLE = [
  'BroTown HD pixel art: crisp, modern high-definition pixel art on one clean square pixel grid, like Eastward or Sea of Stars.',
  'Every pixel is a hard-edged square: no blur, no anti-aliasing, no soft brushes and no smooth gradients.',
  'Each colour is shaded with 3 to 5 flat tones, in clusters of pixels rather than single stray ones, with shadows shifted toward cool blue-purple and highlights toward warm yellow.',
  MATERIALS,
  'Soft, even daylight from the upper left. No shadows cast on the ground, and no glow, fog or lighting effects: the game adds those.',
  'The ground has no outlines. Anything that stands up has a one-pixel outline in a darker shade of its own colour, never black, lighter on the sunlit side.',
  'Moderate saturation, with the ground calm and mid-toned so characters stand out.',
  'Seen from a steep three-quarter top-down angle, with no perspective.',
].join(' ');

/* Added to every GROUND picture: ground is a stage, not a scene.  Variety
   comes from two versions of each ground mixed by the game and from small
   details scattered on top, never from busy tiles. */
export const QUIET_GROUND = 'The texture is quiet and clean: broad, smooth areas of the base tones, with small accents covering no more than about a tenth of the area, and no noise, speckle or grain. Nothing bigger than a pebble or a flower, and no objects, paths or water.';

/* ═══ v2.3.2944: GROUND HAS NO DIRECTION ═══
   Owner, on the first Main Street swatch in the game: "It's tiling wagon
   trails sideways and it doesn't look good.  Any specific detail that would
   look bad when placed in the wrong direction tiled is probably not a good
   prompt."  Exactly so: a swatch is laid the same way up everywhere
   (world/core/ground.js), whichever way the street, road or shore runs, so
   ruts along the picture's width run ACROSS every north-south street.  Every
   ground swatch's prompt carries this, and no swatch brief may ask for a
   detail with a direction (tools/world/test-world-core.mjs checks the
   briefs).  Things that do follow a road -- ruts, rails, a line of planks --
   are objects laid along it later, never ground. */
export const NO_DIRECTION = 'Nothing in it runs one way: no ruts, tracks, footprints, rows, long planks, stripes, streaks or ripples that point in a direction. This square is laid the same way up everywhere, whichever way a road or a shore runs, so every detail must look right from any side.';

/* ═══ v2.3.2949: THE ONE GROUND THAT RUNS ONE WAY ═══
   The boardwalk -- the town's boardwalks and every bridge -- is laid by the
   game (world/core/ground.js, PLANK DECKS): it turns the boards to lie
   across each deck, and makes them half a cell wide.  Owner: "I had to
   change the checker pattern wood the original prompt made it didn't look
   right."  So its prompt asks for plain boards that DO run one way, big
   and clear (they are made about four times smaller), in place of
   NO_DIRECTION. */
export const PLANK_BOARDS = 'The boards all run the same way, left to right across the picture, about twelve to sixteen of them from top to bottom, each with a clear dark gap along both sides. The game turns them to lie across every boardwalk and bridge and makes them smaller, so draw them big and clear: no pattern of blocks, no border and no railings.';

/* v2.3.2939: what every chat is told about the one picture attached to it --
   the style key, never the bro (see the header).  "Do not copy its tiles":
   the key shows a meadow, a street, a shore; a swatch asked for one ground
   must not come back as a collage of the key. */
export const KEY_MATCH = "Attached is the game's style key. Match its pixel size, colours, shading and the way it draws each material exactly, but do not copy its tiles.";

/* v2.3.2947: EDGE PIECES -- a ground's own loose tufts, lumps and drifts,
   which the game scatters where it lies over another ground (world/core/
   ground.js).  The one chat that is shown more than the style key: the
   pieces must be THAT ground exactly, and the ground's swatch is world art
   in this style, so it is attached too -- or the prompt is sent in the
   chat the swatch was made in.  (Never the bro: see the header.) */
export const EDGE_MATCH = "Attached are the game's style key and this ground's own swatch (or send this in the chat where you made the swatch). Match the swatch exactly: its colours, pixel size, shading and the way it draws its material. Do not copy its layout.";
/* v2.3.2951: BLEND PICTURES -- the ground halfway between two alike grounds,
   which the game lays through the middle of the zone where they mix
   (world/core/ground.js, BLEND PICTURES).  The one chat shown two ground
   swatches and not the style key: a blend must be made of exactly those
   two, and they are world art in this style already -- the key would only
   be a third look to copy.  (Never the bro: see the header.)  Said after
   the prompt names the two pictures. */
export const BLEND_MATCH = 'Match them exactly: their colours, pixel size, shading and the way each draws its material, using only what is in them. Do not copy their layout.';
/* The one flat colour an edge-pieces picture is drawn on, cut away by the
   Ground Studio (style/process.js, keyOut). */
export const EDGE_BACKGROUND = 'The background is ONE flat magenta colour (#FF00FF) everywhere, with no shading, gradient, texture, shadow or glow, so it can be cut away cleanly. Nothing in the pieces is magenta.';

/* v2.3.2939: a size in words -- "a person standing here would be about one
   seventh as tall as this picture" -- for a picture `pictureGamePx` game px
   on a side. */
const ORDINAL = { 2: 'half', 3: 'third', 4: 'quarter', 5: 'fifth', 6: 'sixth', 7: 'seventh', 8: 'eighth', 9: 'ninth', 10: 'tenth' };
export function personScale(pictureGamePx) {
  const n = Math.max(2, Math.round(pictureGamePx / PIXEL.personGamePx));
  return `a person standing here would be about one ${ORDINAL[n] || `${n}th`} as tall as this picture`;
}
