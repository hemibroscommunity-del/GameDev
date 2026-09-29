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
 */

export const PIXEL = {
  /* One art pixel is this many game px.  The bro's own pixels are about 2,
     so the world is a little finer-grained than he is -- on purpose: it
     makes characters read as figures on a stage. */
  gamePxPerArtPx: 1.5,
  /* Colours in the one palette the whole world shares, the reserved effect
     colours (night, water, fire) included.  Made once from the style key,
     then frozen: every picture is moved onto it. */
  palette: 64,
  /* A ground swatch, in art px: 768 game px on a side, most of a phone
     screen's width and three quarters of its height. */
  groundTile: 512,
};

/* The style paragraph every picture's prompt carries. */
export const HD_STYLE = [
  'BroTown HD pixel art: crisp, modern high-definition pixel art on one clean square pixel grid, like Eastward or Sea of Stars.',
  'Every pixel is a hard-edged square: no blur, no anti-aliasing, no soft brushes and no smooth gradients.',
  'Each colour is shaded with 3 to 4 flat tones, in clusters of pixels rather than single stray ones, with shadows shifted toward cool blue-purple and highlights toward warm yellow.',
  'Soft, even daylight from the upper left. No shadows cast on the ground, and no glow, fog or lighting effects: the game adds those.',
  'The ground has no outlines. Anything that stands up has a one-pixel outline in a darker shade of its own colour, never black, lighter on the sunlit side.',
  'Moderate saturation, with the ground calm and mid-toned so characters stand out.',
  'Seen from a steep three-quarter top-down angle, with no perspective.',
].join(' ');

/* Added to every GROUND picture: ground is a stage, not a scene.  Variety
   comes from two versions of each ground mixed by the game and from small
   details scattered on top, never from busy tiles. */
export const QUIET_GROUND = 'The texture is quiet: mostly the base tones, with small accents covering no more than about a tenth of the area. Nothing bigger than a pebble or a flower, and no objects, paths or water.';

