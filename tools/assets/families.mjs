/* v2.3.5241: THE FAMILY TABLE (grand plan step 9.1, card P; docs/specs/asset-door.md).
 *
 * DATA: no I/O, no imports.  tools/assets/shipped.mjs reads it, matches every
 * file in reach to one row, and writes tools/assets/shipped.json.
 *
 * A FAMILY IS A PATH PATTERN, NEVER A FOLDER.  One folder holds all three
 * kinds side by side: public/sprites/player/ has the bro's sheets (supplied),
 * their .webp twins (made, by the bot) and anchors.json (data).  Each file in
 * reach matches exactly one row; a file no row matches is `unsorted` (a
 * census: its count only falls).  A pattern is a glob over the path from the
 * repository's root: `**` any run of folders, `*` within one name, `?` one
 * character, `{a,b}` either.  Where a wider row would also match a narrower
 * row's files (the `.p256.png` twins beside the `.png` files they are made
 * from), the wider row names them in its `not`.
 *
 * THE KINDS:
 *   supplied  came from outside the repository: a ChatGPT sheet, an upload, a
 *             recording, the owner's own art.  THE DOOR FINISHES ONLY THESE
 *             (tools/assets/finish.mjs, PR 3).
 *   made      written by a tool in the repository from named sources.  It
 *             changes when its source or its tool changes, re-made by that
 *             tool: the door never rewrites it.  In doubt, a family is made
 *             with its tool 'unknown', never supplied.
 *   data      bytes the game reads as numbers, not colours: the look sheets
 *             (colour NUMBERS in red and green, lookUnpack.js: put on 256
 *             colours, every body would be scrambled), anchors, maps, the
 *             Wheel's bakes, the portrait atlas.  The door never rewrites it.
 *
 * A ROW:
 *   name     the family's one name (shipped.json's `family`)
 *   pattern  a glob, or a list of globs
 *   not      globs the pattern would match that belong to another row
 *   kind     supplied | made | data
 *   tool     made (and data a tool writes): the tool's path, or 'unknown';
 *            supplied: null
 *   sources  made: what the tool reads (paths or globs; under assets/, by
 *            path, as tools/assets/sources.json names them by hash), or
 *            'beside' (the file of the same name beside it); else null
 *   draw     the draw path today, every switch at its default (DRAWS below)
 *   loader   the module that loads it (null for `none`)
 *   bundle   the bundle of colours: the group that shares one row of the
 *            palette atlas (picsNumbers.js rowFor), or null
 *   px       the pixel-size rule: 'art law' (2 px a game px,
 *            public/tools/style/bible.js) or the frame size its loader
 *            assumes ('frame 128x128'), or null
 *   bar      what the game's reader must read: 256 colours at most, the
 *            size of `px`, read back by src/rendering/png8Decode.js.  Every
 *            picture family has it; held by the gate (PR 4) for supplied
 *            families only.  A family over it today is counted, not failed.
 *            null: not a picture the bar holds (sound, data, a vector).
 *   note     a few words
 *
 * The census (docs/plan/census/assets.md, PR 2) measures each family by the
 * MB it holds at the memory check's fight, not by its bytes on disk.
 */

/* what the door reaches: every file git tracks under public/ that is a
   picture, a sound, a video or data.  Code is out (.js, .html, the Tiled
   tile sets' .tsx, _headers, the manifest).  `jpg` is the one JPEG not
   spelled `jpeg` (public/intro/mayor-welcome-poster.jpg). */
export const REACH = Object.freeze({
  under: 'public/',
  ext: Object.freeze(['png', 'webp', 'jpeg', 'jpg', 'svg', 'mp3', 'm4a', 'mp4', 'json', 'bin', 'tmx']),
});

export const KINDS = Object.freeze(['supplied', 'made', 'data']);

/* THE DRAW PATHS: a closed list taken from the code, each naming its module */
export const DRAWS = Object.freeze({
  file: 'a picture on its own colours: a Pixi texture from the file (Assets.load, a sheet .json); src/rendering/pixiApp.js counts it',
  numbers: 'colour numbers on the palette atlas: src/rendering/paletteTex.js, picsNumbers.js',
  strip: 'a strip loaded as you walk: src/rendering/zoneTextures.js loadTrackedStrip (stripRead.js reads its numbers off the page)',
  look: 'a look sheet: src/rendering/lookPalette.js (lookUnpack.js, lookSets/)',
  wheel: 'the Wheel\'s ground and objects: src/rendering/paletteLoad.js and the wheel modules',
  dom: 'a picture in the page (an <img>, a CSS background)',
  sfx: 'a sound decoded on play: src/data/gameDisplay.js SFX_MANIFEST, src/data/sfxCache.js',
  music: 'music streamed by the music deck: src/data/gameDisplay.js',
  data: 'read as numbers: fetched and parsed, never drawn',
  none: 'nothing loads it today',
});

/* the bar every picture family records (the readings: card P) */
const BAR = (px) => Object.freeze({ colours: 256, size: px || null, reader: 'src/rendering/png8Decode.js' });

export const FAMILIES = Object.freeze([
]);
