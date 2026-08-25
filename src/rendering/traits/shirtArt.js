/* ═══ v2.3.1938: DRAW YOUR OWN SHIRT ═══
 *
 * Owner: "allowing people to customize their own t shirts ... a drawing
 * feature with your finger (or mouse if on desktop)".
 *
 * This file is the DRAWING itself — the grid, its encoding, and where it is
 * kept.  Nothing here knows how to render a character; shirtDecal.js stamps it
 * onto the shirt art, and the creator paints into it.
 *
 * ── WHY 16x16, AND WHY ONE HEX CHARACTER PER PIXEL ──
 * The shirt's chest reads about 20 device pixels across on a phone, so a finer
 * grid would be drawing detail nobody can see, and a coarser one cannot hold a
 * letter or a smiley.  16x16 with a 16-entry palette encodes as exactly 256 hex
 * characters, which matters because the drawing has to travel: cosmetics on the
 * wire are length-capped (_sanitizeJoinData truncates most to 64 chars, and
 * `avatar` — the one deliberately-larger field — to 512).  256 fits inside that
 * precedent with room to spare, and needs no bit-packing anyone has to debug.
 *
 * Palette index 0 is TRANSPARENT, so an empty drawing is 256 zeros and every
 * "is anything drawn" test is a scan for a non-zero character.
 *
 * The palette is fixed rather than free RGB for the same reason the other
 * recolour catalogs are: a value that arrives from another player is mapped
 * through this table and anything unrecognised answers transparent, so a forged
 * string can only ever paint colours that already exist here.
 */

export const ART_W = 16;
export const ART_H = 16;
export const ART_LEN = ART_W * ART_H;   /* one hex char per cell */

/* index 0 = transparent; 1-15 are the paintable colours. */
export const ART_PALETTE = [
  null,
  '#1b1f24', '#ffffff', '#c8402f', '#e2803a', '#f2c94c',
  '#5aa84f', '#2f8f7d', '#3f7fd0', '#2b3a67', '#8e5ad0',
  '#d76ba8', '#8a5a3c', '#9aa3ab', '#5c6670',
];

const HEX = '0123456789abcdef';

/** An empty drawing: every cell transparent. */
export function emptyArt() { return '0'.repeat(ART_LEN); }

/** True if the string is a well-formed drawing (right length, hex only). */
export function isValidArt(s) {
  return typeof s === 'string' && s.length === ART_LEN && /^[0-9a-f]+$/.test(s);
}

/** True if anything is actually painted. */
export function artHasInk(s) { return isValidArt(s) && /[^0]/.test(s); }

/** Palette colour for a cell character, or null for transparent/unknown. */
export function artColorAt(s, x, y) {
  if (!isValidArt(s)) return null;
  const i = HEX.indexOf(s[y * ART_W + x]);
  return (i > 0 && i < ART_PALETTE.length) ? ART_PALETTE[i] : null;
}

/** A copy of `s` with cell (x,y) set to palette index `idx`. */
export function artWith(s, x, y, idx) {
  if (!isValidArt(s) || x < 0 || y < 0 || x >= ART_W || y >= ART_H) return s;
  const i = y * ART_W + x;
  const ch = HEX[Math.max(0, Math.min(ART_PALETTE.length - 1, idx | 0))];
  if (s[i] === ch) return s;
  return s.slice(0, i) + ch + s.slice(i + 1);
}

/* ── FRONT AND BACK ──
 *
 * Owner: "It actually makes sense to have a front and back custom t shirt."
 * Right, and it also answers a question the single-drawing version could not:
 * what a print should do when you turn around.  With one drawing the back of
 * the shirt showed the front's design; with two, each side shows its own.
 *
 * Which side a facing gets is fixed by the art's five base directions:
 *
 *   south, southwest   -> FRONT   (and southeast, drawn as mirrored southwest)
 *   north, northeast   -> BACK    (and northwest, drawn as mirrored northeast)
 *   east               -> FRONT   (and west; a profile shows the chest edge-on,
 *                                  and the front is what is turned toward you)
 */
export const SHIRT_SIDES = ['front', 'back'];

/** Which drawing a facing shows. */
export function sideForDir(dir) {
  return (dir === 'north' || dir === 'northeast' || dir === 'northwest') ? 'back' : 'front';
}

/* ── selection store (localStorage) ── */
const STORAGE_KEY = { front: 'bt-shirtart', back: 'bt-shirtart-back' };
const _active = { front: emptyArt(), back: emptyArt() };
for (const side of SHIRT_SIDES) {
  try {
    const saved = typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY[side]);
    if (isValidArt(saved)) _active[side] = saved;
  } catch (e) { /* localStorage unavailable (SSR / privacy mode) */ }
}

const _listeners = new Set();

/** The drawing for one side, always a valid 256-char string. */
export function getShirtArt(side) { return _active[side === 'back' ? 'back' : 'front']; }

/** The drawing a FACING shows, or null when that side is blank. */
export function shirtArtForDir(dir) {
  const a = getShirtArt(sideForDir(dir));
  return artHasInk(a) ? a : null;
}

/** Replace one side's drawing and persist it.  Invalid input is ignored rather
 *  than stored, so a corrupted localStorage value cannot poison the renderer. */
export function setShirtArt(side, s) {
  const k = side === 'back' ? 'back' : 'front';
  if (!isValidArt(s) || s === _active[k]) return;
  _active[k] = s;
  try { localStorage.setItem(STORAGE_KEY[k], s); } catch (e) { /* ignore */ }
  _listeners.forEach((fn) => { try { fn(k, s); } catch (e) { /* ignore */ } });
}

export function onShirtArtChange(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

/** Sanitise a drawing that arrived from ANOTHER player.  Returns null unless it
 *  is exactly the shape this file defines — the renderer never sees anything
 *  else, so a peer cannot make the client allocate or paint something odd. */
export function sanitizeShirtArt(s) {
  return (isValidArt(s) && artHasInk(s)) ? s : null;
}
