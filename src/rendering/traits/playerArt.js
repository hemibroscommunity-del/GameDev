/* ═══ v2.3.1938: DRAW YOUR OWN — SHIRT, PANTS, TATTOOS ═══
 *
 * Owner: "allowing people to customize their own t shirts ... a drawing
 * feature with your finger (or mouse if on desktop)".
 *
 * This file is the DRAWINGS themselves — the grid, its encoding, and where they
 * are kept.  Nothing here knows how to render a character; playerDecal.js
 * stamps them, and the creator paints into them.
 *
 * v2.3.1940 (owner: "allow drawing on pants too.  Also allow drawing in the
 * form of tattoos on the character skin") — one grid, four canvases.  The shirt
 * is a separate sprite; pants and skin are REGIONS OF THE BODY SHEET, which is
 * why the stamper takes a region rather than assuming the whole sprite.
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

/** True if anything is actually painted.
 *
 *  v2.3.1945: "not zero" is NOT the same as "paints something", and the gap was
 *  reachable.  The palette holds 15 entries, so indices 0-e; the character 'f'
 *  is a well-formed hex digit that no colour answers to, and artColorAt maps it
 *  to transparent.  A drawing of 256 'f's therefore passed isValidArt, passed
 *  the old non-zero test, travelled the wire, and made every client that saw it
 *  bake a whole extra body sheet AND shirt sheet to render nothing at all.
 *  The picker cannot produce one (artWith clamps), so this only ever arrives
 *  hand-edited or from a peer -- which is exactly the input that has to be
 *  checked.  Now a cell counts only if the palette actually has a colour for
 *  it, which is the same rule artColorAt paints by. */
export function artHasInk(s) {
  if (!isValidArt(s)) return false;
  for (let i = 0; i < s.length; i++) {
    const c = HEX.indexOf(s[i]);
    if (c > 0 && c < ART_PALETTE.length) return true;
  }
  return false;
}

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

/** The palette index a cell RENDERS as: 0 for transparent, and 0 for any hex
 *  digit the palette has no colour for.  The picker cannot produce one of those
 *  (artWith clamps), but a hand-edited localStorage value can, and the fill tool
 *  has to agree with the eye about what counts as one region — 'f' and '0' both
 *  paint nothing, so they are the same region. */
export function artInkAt(s, x, y) {
  if (!isValidArt(s) || x < 0 || y < 0 || x >= ART_W || y >= ART_H) return 0;
  const i = HEX.indexOf(s[y * ART_W + x]);
  return (i > 0 && i < ART_PALETTE.length) ? i : 0;
}

/** A copy of `s` with EVERY cell in `cells` set to `idx`.
 *
 *  v2.3.1948: artWith rebuilds the whole 256-char string per cell, which is
 *  fine for a pen stroke (one cell per pointer event) and wasteful for a tool
 *  that commits a filled shape — a bucket fill can touch all 256 at once.  One
 *  array, one join. */
export function artWithCells(s, cells, idx) {
  if (!isValidArt(s) || !cells || !cells.length) return s;
  const ch = HEX[Math.max(0, Math.min(ART_PALETTE.length - 1, idx | 0))];
  const out = s.split('');
  for (let i = 0; i < cells.length; i++) {
    const x = cells[i][0], y = cells[i][1];
    if (x < 0 || y < 0 || x >= ART_W || y >= ART_H) continue;
    out[y * ART_W + x] = ch;
  }
  return out.join('');
}

/* ── THE FOUR CANVASES ──
 *
 * Owner: "It actually makes sense to have a front and back custom t shirt",
 * then "allow drawing on pants too.  Also allow drawing in the form of tattoos
 * on the character skin."
 *
 * Which shirt side a facing gets is fixed by the art's five base directions:
 *
 *   south, southwest   -> FRONT   (and southeast, drawn as mirrored southwest)
 *   north, northeast   -> BACK    (and northwest, drawn as mirrored northeast)
 *   east               -> FRONT   (and west; a profile shows the chest edge-on,
 *                                  and the front is what is turned toward you)
 *
 * Pants and tattoo have ONE canvas each rather than two.  A leg print reads the
 * same from either side at this size, and a chest tattoo is a chest tattoo —
 * splitting them would double the wire cost and the UI for a distinction nobody
 * could see on a 20-pixel torso.
 */
export const CANVASES = ['shirtFront', 'shirtBack', 'pants', 'tattoo'];
export const SHIRT_SIDES = ['front', 'back'];

/** Which shirt drawing a facing shows. */
export function sideForDir(dir) {
  return (dir === 'north' || dir === 'northeast' || dir === 'northwest') ? 'back' : 'front';
}

/* ── selection store (localStorage) ── */
const STORAGE_KEY = {
  shirtFront: 'bt-shirtart', shirtBack: 'bt-shirtart-back',
  pants: 'bt-pantsart', tattoo: 'bt-tattooart',
};
const _active = Object.create(null);   /* CLAUDE.md rule 4 */
for (const id of CANVASES) {
  _active[id] = emptyArt();
  try {
    const saved = typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY[id]);
    if (isValidArt(saved)) _active[id] = saved;
  } catch (e) { /* localStorage unavailable (SSR / privacy mode) */ }
}

const _listeners = new Set();

/** One canvas's drawing, always a valid 256-char string. */
export function getArt(id) { return _active[id] || emptyArt(); }

/** One canvas's drawing, or null when it is blank — what renderers want. */
export function inkedArt(id) {
  const a = getArt(id);
  return artHasInk(a) ? a : null;
}

/** The shirt drawing a FACING shows, or null when that side is blank. */
export function shirtArtForDir(dir) {
  return inkedArt(sideForDir(dir) === 'back' ? 'shirtBack' : 'shirtFront');
}

/** Replace one canvas and persist it.  Invalid input is ignored rather than
 *  stored, so a corrupted localStorage value cannot poison the renderer. */
export function setArt(id, s) {
  if (!STORAGE_KEY[id] || !isValidArt(s) || s === _active[id]) return;
  _active[id] = s;
  try { localStorage.setItem(STORAGE_KEY[id], s); } catch (e) { /* ignore */ }
  _listeners.forEach((fn) => { try { fn(id, s); } catch (e) { /* ignore */ } });
}

export function onArtChange(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

/* v2.3.1938 names, kept so the shirt call sites read as shirt code. */
export function getShirtArt(side) { return getArt(side === 'back' ? 'shirtBack' : 'shirtFront'); }
export function setShirtArt(side, s) { setArt(side === 'back' ? 'shirtBack' : 'shirtFront', s); }
export const onShirtArtChange = onArtChange;

/** Sanitise a drawing that arrived from ANOTHER player.  Returns null unless it
 *  is exactly the shape this file defines — the renderer never sees anything
 *  else, so a peer cannot make the client allocate or paint something odd. */
export function sanitizeShirtArt(s) {
  return (isValidArt(s) && artHasInk(s)) ? s : null;
}
export const sanitizeArt = sanitizeShirtArt;

/** Short stable key for a drawing.  FNV-1a; 8 hex chars is plenty to separate
 *  the handful of drawings alive at once, and a collision only ever means two
 *  players briefly share a bake.  Lives here rather than in either renderer
 *  because BOTH of them cache by it (the shirt sheet and the body sheet), and
 *  two spellings of "which drawing is this" is one spelling too many. */
export function artHash(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16);
}
