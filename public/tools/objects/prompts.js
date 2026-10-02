/* ═══ v2.3.2964: THE OBJECT STUDIO'S PROMPTS ═══
 *
 * One prompt per entry in the catalog (catalog.js), built from:
 *   - what the object IS: the entry's words (and, for a building, its job,
 *     its end of town, its look, its big jokes and its sign);
 *   - the words every picture shares: the HD pixel art paragraph, the
 *     "Built by Bros" brief for buildings (../style/bible.js, docs/WORLD-
 *     BIBLE.md §6 and §12);
 *   - the one picture attached to every chat: the style key (never the bro:
 *     he is simpler pixel art than the world, and ChatGPT copies what it
 *     sees, so sizes are given in words).
 *
 * THE SCALE.  Every picture is as tall as a ground swatch covers, 512 game
 * px (a person about one fifth of it, as in the ground prompts), and the
 * object is asked for at its true size inside that.  Matched to the style
 * key's pixel size, its pixels then come out the ground's size in the game.
 * The studio sizes it exactly afterwards, and says when ChatGPT drew it so
 * far off that its pixels no longer match (app.js, pixelRatio).
 */
import { PIXEL, HD_STYLE, KEY_MATCH, BUILT_BY_BROS, objectBackground, personScale } from '../style/bible.js';
import { ENDS } from './catalog.js';

/* game px a picture covers, top to bottom -- a ground swatch's */
export const FRAME_GAME_PX = PIXEL.groundTile * PIXEL.gamePxPerArtPx;
/* the picture's size in game px: square, or 3:2 for the wide sets */
export function frameOf(entry) {
  return { w: entry.frame === 'wide' ? FRAME_GAME_PX * 1.5 : FRAME_GAME_PX, h: FRAME_GAME_PX };
}

const FRACS = [[1 / 16, 'a sixteenth'], [1 / 12, 'a twelfth'], [0.1, 'a tenth'], [0.125, 'an eighth'], [1 / 6, 'a sixth'], [0.2, 'a fifth'], [0.25, 'a quarter'], [1 / 3, 'a third'], [0.4, 'two fifths'], [0.5, 'half'], [0.6, 'three fifths'], [2 / 3, 'two thirds'], [0.75, 'three quarters'], [0.8, 'four fifths'], [0.9, 'nine tenths']];
export function fraction(f) {
  let best = FRACS[0], bd = Infinity;
  for (const x of FRACS) { const d = Math.abs(Math.log(f / x[0])); if (d < bd) { bd = d; best = x; } }
  return best[1];
}
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
function times(r) {
  const v = Math.round(r * 2) / 2, whole = Math.floor(v), half = v > whole;
  if (v === 2) return 'twice';
  return `${half ? `${WORDS[whole]} and a half` : WORDS[whole]} times`;
}

/* How big one is, in words, beside a person (PIXEL.personGamePx). */
export function sizeWords(entry) {
  const r = entry.size / PIXEL.personGamePx;
  if (entry.fit === 'w') {
    if (r < 0.85) return `about ${fraction(r)} as wide as a person is tall`;
    if (r < 1.25) return 'about as wide as a person is tall';
    return `about ${times(r)} as wide as a person is tall`;
  }
  if (r < 0.4) return 'about knee-high on a person';
  if (r < 0.62) return 'about waist-high on a person';
  if (r < 0.85) return 'about chest-high on a person';
  if (r < 1.25) return 'about as tall as a person';
  return `about ${times(r)} as tall as a person`;
}

/* The scale line: the frame, then the object inside it. */
export function scaleLine(entry) {
  const f = frameOf(entry);
  const frame = `${personScale(f.h)}`;
  const one = entry.count === 1 ? 'It is' : 'Each one is';
  const share = entry.fit === 'w'
    ? `so it fills about ${fraction(entry.size / f.w)} of the picture's width`
    : `so it is about ${fraction(entry.size / f.h)} as tall as the picture`;
  if (entry.kind === 'building') {
    return `${frame}. The building is ${sizeWords(entry)}, ${share}. Its door is a little taller than a person, and each storey is about one and a half times as tall as a person.`;
  }
  return `${frame}. ${one} ${sizeWords(entry)}, ${share}.`;
}

const SHAPE = (entry) => (entry.frame === 'wide' ? 'A wide picture (3:2, landscape)' : 'A square picture');
const NUM = ['', 'one', 'two', 'three', 'four', 'five', 'six'];
const signLine = (sign, also) => `One big, simple sign reads "${sign}" in chunky capital letters, easy to read at a glance. No other words, letters or numbers anywhere${also ? `, apart from ${also}` : ''}.`;

export function promptFor(entry) {
  if (entry.kind === 'building') return buildingPrompt(entry);
  const head = entry.count === 1
    ? `${SHAPE(entry)} of ONE object for BroTown, a top-down 2D action RPG: ${entry.what}.`
    : `${SHAPE(entry)} of a set of ${NUM[entry.count]} for BroTown, a top-down 2D action RPG: ${entry.what}, ${NUM[entry.count]} different ones in a row, side by side and not touching: ${entry.ones}.`;
  const whole = entry.count === 1
    ? 'It is drawn whole in the middle of the picture, with plenty of background all round and nothing cut off.'
    : 'Each is drawn whole, with plenty of background around it and nothing cut off by the picture\'s edge.';
  const own = entry.kind === 'prop' ? ' Built and used by Bros: well made, a little battered, with a proud repair or a dent here and there.' : '';
  return [
    `${head} ${whole} ${entry.count === 1 ? 'It stands on nothing: no ground, grass, path or shadow under or around it, and the place where it meets the ground is plain to see.' : 'They stand on nothing: no ground, grass, path or shadow under or around them, and the place where each meets the ground is plain to see.'}${own}`,
    `${entry.sign ? signLine(entry.sign) : 'No text, letters or numbers anywhere.'} ${objectBackground(entry.key)} No border.`,
    `Style: ${HD_STYLE}`,
    `${KEY_MATCH} Scale: ${scaleLine(entry)}`,
  ].join('\n\n');
}

/* v2.3.2964: the buildings, the owner's "more specific prompts" -- each its
   job, its end of town, its architecture and materials, its one or two big
   jokes, its sign; then the porch (v2.3.2960: the boardwalks come back as
   each shop's porch, drawn with it), the square-on view the placing needs,
   and the Built by Bros brief. */
function buildingPrompt(entry) {
  return [
    `${SHAPE(entry)} of ONE building for BroTown, a top-down 2D action RPG set in a frontier boomtown built by Bros: the ${entry.name}, ${entry.job}. ${ENDS[entry.end] || ''}`.trim(),
    `${entry.look} The bro touches, big and easy to read: ${entry.bro}.`,
    `${signLine(entry.sign, entry.also)}`,
    'A raised wooden porch runs along the whole front, a step up from the ground, with wide steps down at the middle in front of the door. The porch is part of the building.',
    'Drawn square-on, its front facing us straight: we see the whole front, and the roof from above at a steep angle, and no side walls. Every upright line runs straight up the picture. The whole building fits in the picture with plenty of background all round, nothing cut off. It stands on nothing: no ground, grass, path, fence or shadow under or around it.',
    BUILT_BY_BROS,
    `${objectBackground(entry.key)} No border.`,
    `Style: ${HD_STYLE}`,
    `${KEY_MATCH} Scale: ${scaleLine(entry)}`,
  ].join('\n\n');
}
