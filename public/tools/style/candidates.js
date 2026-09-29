/* ═══ v2.3.2934: THE STYLE LAB'S CANDIDATES ═══
 *
 * Owner, 2026-09-29: "Yeah I don't know what aesthetic style is best. Maybe it
 * should all be pixel art. Maybe only map should be painterly for a unique
 * look. … Maybe I'll test which aesthetic style looks best. Simple pixel art,
 * high definition pixel art, painterly, and any other art styles you think
 * would pair well with the simple character art sprite … Help me out with a
 * test plan too."
 *
 * One entry per look.  The CONTENT of every prompt is identical across looks
 * -- the same meadow, the same four objects, the same store, the same mayor --
 * and only the STYLE paragraph changes, so what the owner compares is the
 * style and nothing else.  The plan the owner follows is docs/STYLE-TEST.md.
 *
 * v2.3.2935: the owner chose HD pixel art on a 1.5 game px grid.  That look
 * now carries the settings and words every later picture uses (bible.js), so
 * the lab shows a picture exactly as the game will; the other looks stay for
 * the record and for comparing.
 *
 * `render` is what the lab (and later the asset pipeline) does to ChatGPT's
 * pictures before they are drawn:
 *   smooth   draw with smoothing (painted) or as hard pixels (pixel art)
 *   snap     game px per art pixel: the picture is reduced to that grid.
 *            The bro's own pixels are ~2.1 game px, so 2 is "his size".
 *            0 = leave the picture's own resolution alone.
 *   palette  colours shared by the whole look (0 = keep every colour)
 *   ground   the ground tile's size in game px (640 when not given)
 * `things` overrides `render` for everything that stands on the ground.
 * `from` borrows another look's pictures, so the two derived looks need no
 * ChatGPT pictures of their own.
 */

import { PIXEL, HD_STYLE, QUIET_GROUND, KEY_MATCH, personScale } from './bible.js';

export const SLOTS = [
  { id: 'ground', name: 'Ground', what: 'a seamless ground tile' },
  { id: 'objects', name: 'Objects', what: 'a tree, a boulder, a bush and a signpost on magenta' },
  { id: 'building', name: 'Building', what: 'a Bros general store on magenta' },
  { id: 'npc', name: 'NPC', what: 'Mayor Bro on magenta' },
];

/* The order the objects sheet is asked for, left to right, and how tall each
   stands against the bro (105.7 game px crown to foot, worldViewport.js). */
export const OBJECT_TYPES = [
  { id: 'tree', h: 190 },
  { id: 'rock', h: 52 },
  { id: 'bush', h: 58 },
  { id: 'sign', h: 96 },
];
export const BUILDING_W = 300;   /* a Main Street plot: 230 art px x 1.3 */
export const NPC_H = 112;        /* the blacksmith's figure, NPC_SCALE_MULT 1.14 */

const CONTENT = {
  ground: 'A seamless, tileable square texture of meadow ground for a top-down 2D action RPG, seen from directly above: short green grass with a few small wildflowers, two or three bare dirt patches and tiny pebbles. Soft, even daylight with no strong shadows. Nothing taller than the grass: no trees, rocks, paths, water, people or text, and no border. Every edge must continue seamlessly into the opposite edge.',
  objects: 'A sprite sheet for a top-down 2D action RPG, seen from the same steep three-quarter angle as the attached character. Four separate objects in one row, left to right, with wide empty gaps between them: 1. a leafy oak tree, 2. a mossy boulder, 3. a round green bush, 4. a wooden signpost with a blank board. Each object whole and standing on its own, with no ground under it and no cast shadow. A plain, flat magenta background (#FF00FF) everywhere else. No text.',
  building: 'One building for a top-down 2D action RPG, seen from the same steep three-quarter angle as the attached character: the front of a two-storey wooden frontier general store that a crew of cheerful adventurer bros built, patched and brag about. A pair of antlers over the door, a weapon rack and a stack of barrels on the porch, a dent proudly patched with a mismatched plank, and one big friendly sign with the single word "BROS". The whole building, with no ground around it and no cast shadow, on a plain, flat magenta background (#FF00FF).',
  npc: 'One character for a top-down 2D action RPG: Mayor Bro, a cheerful, slightly ridiculous frontier mayor with a sash and a big grin, standing and facing the viewer, full body, at the same size, proportions and camera angle as the attached character. A plain, flat magenta background (#FF00FF). No text.',
};

const MATCH = {
  ground: 'The attached picture is our hero, for scale and style: draw the grass and pebbles at his scale (he would be about one eighth as tall as this picture) and in the same line weight and colour saturation.',
  objects: 'The attached picture is our hero. Match him: the same line weight and colour saturation, and his scale -- the tree about twice his height, the boulder about half, the signpost about his height.',
  building: 'The attached picture is our hero. Match his line weight and colour saturation; the building is about three times his height.',
  npc: 'The attached picture is our hero. Match him exactly in style, line weight, colour saturation and size.',
};

/* v2.3.2939: the chosen look is matched to the STYLE KEY, not the bro
   (bible.js, KEY_MATCH).  Owner: "I don't really want my character to be the
   reference image because I'm wanting the world to be high definition pixel
   art (especially material-aware texturing) and my character is simple pixel
   art."  Sizes are said in words; the pipeline scales every picture to its
   size anyway.  Mayor Bro too: NPCs are HD pixel art like the rest of the
   world (docs/WORLD-BIBLE.md §6), at an ordinary person's size. */
const KEY_REF = {
  ground: `${KEY_MATCH} Scale: ${personScale(PIXEL.groundTile * PIXEL.gamePxPerArtPx)}.`,
  objects: `${KEY_MATCH} Sizes: the tree about twice a person's height, the boulder about half, the bush about half and the signpost about a person's height.`,
  building: `${KEY_MATCH} The building is about three times a person's height.`,
  npc: `${KEY_MATCH} Mayor Bro is drawn in that style, at an ordinary person's height and proportions.`,
};
/* The subject, told what the attached picture is. */
function contentFor(style, slot) {
  if (style.ref !== 'key') return CONTENT[slot];
  return CONTENT[slot]
    .replace('at the same size, proportions and camera angle as the attached character', 'seen from the same steep three-quarter angle as the attached style key')
    .replace('as the attached character', 'as the attached style key');
}

export const STYLES = [
  {
    id: 'pixel', name: 'Simple pixel art',
    why: "The bro's own style: chunky pixels, dark outlines, flat colours. The natural match, and the easiest to keep consistent: the pipeline can snap every picture to one grid and one palette.",
    risks: 'Big areas of simple pixel ground can look plain or tiled; it depends on the objects to carry detail.',
    like: 'A Link to the Past, Stardew Valley',
    style: 'Style: simple retro pixel art, exactly like the attached character: chunky, clearly visible square pixels, a dark one-pixel outline round every object, flat colours with only two or three shades each, no gradients, no blur, no anti-aliasing, and a small, limited colour palette.',
    render: { smooth: false, snap: 2, palette: 32 },
  },
  {
    id: 'hdpixel', name: 'HD pixel art (chosen)',
    why: "The owner's choice (v2.3.2935): finer pixels than the bro and richer shading, all on one 1.5 game px grid in one 128-colour palette (64 until v2.3.2940). The bro reads a little chunkier than the world, which makes him stand out like a figure on a stage. Since v2.3.2939 its prompts attach the style key, never the bro, and ask for every material drawn as itself.",
    risks: "Fine pixels shimmer more when the camera moves. ChatGPT's pixels are only pixel-ish, so every picture must go through the snap.",
    like: 'Eastward, Sea of Stars, CrossCode',
    style: 'Style: ' + HD_STYLE,
    extra: { ground: QUIET_GROUND },
    ref: 'key',
    render: { smooth: false, snap: PIXEL.gamePxPerArtPx, palette: PIXEL.palette, ground: PIXEL.groundTile * PIXEL.gamePxPerArtPx },
  },
  {
    id: 'painted', name: 'Painterly',
    why: "Today's maps: soft hand-painted illustration. The most unique look.",
    risks: 'The hardest to match to a pixel bro, and the hardest to keep consistent over hundreds of pictures.',
    like: "today's town painting",
    style: 'Style: rich hand-painted digital painting with soft brushwork and natural colours, like a painted mobile RPG map. No outlines and no pixels.',
    render: { smooth: true, snap: 0, palette: 0 },
  },
  {
    id: 'painted-snap', name: 'Painterly, snapped to pixels',
    why: "The Painterly pictures, reduced by the pipeline to the bro's pixel size and one shared palette: painted light and colour, pixel coherence. Needs no pictures of its own.",
    risks: 'Can look muddy where the painting had fine detail; the palette setting decides a lot.',
    like: "a painting seen through the bro's pixel grid",
    from: { ground: 'painted', objects: 'painted', building: 'painted', npc: 'painted' },
    render: { smooth: false, snap: 2, palette: 48 },
  },
  {
    id: 'flat', name: 'Flat cartoon',
    why: "Bold outlines and flat colour, like the bro, but smooth instead of pixelated. Crisp at any size, and simple shapes are easy to keep consistent.",
    risks: 'A smooth world round a pixel bro may read as two games; plain fills can look empty.',
    like: 'Kingdom Rush, modern vector mobile games',
    style: 'Style: clean flat cartoon illustration with bold dark outlines and flat colour fills, at most one simple shadow tone per colour, no texture and no gradients, like a modern vector mobile game.',
    render: { smooth: true, snap: 0, palette: 0 },
  },
  {
    id: 'mix', name: 'Your mix: painted ground, pixel objects',
    why: "The owner's idea: a painterly map for a unique look, with everything standing on it in the bro's pixel style. Borrows the Painterly ground and the Simple pixel objects, building and NPC.",
    risks: 'The line between painted ground and pixel objects is exactly where the eye looks.',
    like: 'pixel sprites on a painted backdrop',
    from: { ground: 'painted', objects: 'pixel', building: 'pixel', npc: 'pixel' },
    render: { smooth: true, snap: 0, palette: 0 },
    things: { smooth: false, snap: 2, palette: 32 },
  },
];

/* What the owner scores each look on, 1-5.  The first and the sixth decide
   ties: a look the bro does not belong in, or that nobody would screenshot,
   loses whatever else it does well. */
export const CRITERIA = [
  'The bro belongs here',
  'I can tell what I can walk on and what blocks me',
  'Monsters and people stand out from the ground',
  'Night, light, weather and water look good on it',
  'The A and B versions look like the same game',
  "I'd put this screenshot on the store page",
  'ChatGPT gave me a good one without a fight',
];

export function promptFor(style, slot) {
  if (!style.style) return '';
  return [contentFor(style, slot), style.style, style.extra && style.extra[slot], (style.ref === 'key' ? KEY_REF : MATCH)[slot]].filter(Boolean).join('\n\n');
}

export function sourceStyle(style, slot) {
  return (style.from && style.from[slot]) || style.id;
}

export function renderFor(style, slot) {
  return slot === 'ground' ? style.render : (style.things || style.render);
}
