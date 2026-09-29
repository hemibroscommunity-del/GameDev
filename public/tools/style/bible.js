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
  /* One art pixel is this many game px.  The bro's own pixels are about 2,
     so the world is a little finer-grained than he is -- on purpose: it
     makes characters read as figures on a stage. */
  gamePxPerArtPx: 1.5,
  /* Colours in the one palette the whole world shares, the reserved effect
     colours (night, water, fire) included.  Made once from the style key,
     then frozen: every picture is moved onto it.
     v2.3.2940: 64 -> 128.  Owner: "Yes do 128."  With 8 kept for the
     effects, 64 left 56 colours for eight lands and the town: too few for
     material-aware texturing (the Poison Forest's greens would merge with
     the Verdant Wilds', metal would lose its shine steps).  Still ONE shared
     palette, so the look stays one world. */
  palette: 128,
  /* A ground swatch, in art px: 768 game px on a side, most of a phone
     screen's width and three quarters of its height. */
  groundTile: 512,
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
   grit", and got it; texture now comes from clear shapes, never noise. */
export const MATERIALS = 'Every material is drawn as itself, so it can be told apart at a glance by its own texture and the shape of its highlights: grass in soft clumps of blades, packed earth with a few small stones, stone with hard-edged facets, chips and cracks, wood with grain lines and knots, metal with small, sharp, bright highlights, snow and ice in cool blues with crisp edges, and sand in fine wind ripples. Texture comes from a few clear shapes and soft shading, never from noise, speckle or grain. Highlights are small clusters of pixels, never single stray ones.';

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

/* v2.3.2939: what every chat is told about the one picture attached to it --
   the style key, never the bro (see the header).  "Do not copy its tiles":
   the key shows a meadow, a street, a shore; a swatch asked for one ground
   must not come back as a collage of the key. */
export const KEY_MATCH = "Attached is the game's style key. Match its pixel size, colours, shading and the way it draws each material exactly, but do not copy its tiles.";

/* v2.3.2939: a size in words -- "a person standing here would be about one
   seventh as tall as this picture" -- for a picture `pictureGamePx` game px
   on a side. */
const ORDINAL = { 2: 'half', 3: 'third', 4: 'quarter', 5: 'fifth', 6: 'sixth', 7: 'seventh', 8: 'eighth', 9: 'ninth', 10: 'tenth' };
export function personScale(pictureGamePx) {
  const n = Math.max(2, Math.round(pictureGamePx / PIXEL.personGamePx));
  return `a person standing here would be about one ${ORDINAL[n] || `${n}th`} as tall as this picture`;
}
