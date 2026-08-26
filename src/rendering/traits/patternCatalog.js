/* ═══ v2.3.1941: PATTERNS FOR CLOTHING ═══
 *
 * Owner: "I'm wondering if you would be able to draw patterns on top of the
 * plain T shirt as an additional shirt option.  Same with the pants ... Right
 * now they are all plain and you can only select color", then "And yes
 * patterns for clothing like shirt and pants".
 *
 * ── A PATTERN IS A STENCIL, NOT A PICTURE ──
 * The drawing feature (playerArt.js) is ONE 16x16 image scaled into a box on
 * the chest.  A pattern is the opposite thing: a small tile REPEATED across the
 * whole garment.  Trying to serve both from one grid would have made stripes
 * cost 256 characters on the wire and still only cover the middle of a shirt.
 *
 * So a pattern is a tiny tile of on/off cells plus ONE palette colour.  That
 * buys three things:
 *   - it travels as a short string ("stripe-v:3"), well inside the flat 64-char
 *     cosmetic cap, so it needs none of the special handling the drawings do;
 *   - nine tiles x fifteen colours is 135 looks from about forty bytes of data;
 *   - and it composes with everything else — a striped shirt can still carry a
 *     drawn print, because the pattern goes down first and the print over it.
 *
 * ── WHY EACH TILE CARRIES ITS OWN `cell` ──
 * `cell` is how many 256-space pixels one tile cell covers.  The chest is only
 * about 50px across, so a 4-wide tile at cell 3 gives roughly four stripes over
 * a torso — readable — while an 8-wide tile at the same cell would give two,
 * which reads as a blob rather than a pattern.  The big tiles therefore run at
 * cell 2.  Authored against the shipped art, not assumed.
 */

/* Palette indices are playerArt's ART_PALETTE — one table of colours for
   everything a player can put on themselves, so a drawing and a pattern can
   never disagree about what "index 3" means. */
import { ART_PALETTE } from './playerArt.js';

/** id -> tile.  `cells` is w*h characters of '1' (ink) and '0' (fabric). */
export const PATTERN_CATALOG = [
  { id: 'stripe-v', name: 'Stripes', w: 4, h: 1, cell: 3, small: true, cells: '1100' },
  { id: 'stripe-h', name: 'Bands', w: 1, h: 4, cell: 3, small: true, cells: '1100' },
  {
    id: 'check', name: 'Checks', w: 4, h: 4, cell: 3, small: true, cells:
      '1100' +
      '1100' +
      '0011' +
      '0011',
  },
  {
    id: 'dots', name: 'Polka', w: 6, h: 6, cell: 2, cells:
      '000000' +
      '011000' +
      '011000' +
      '000000' +
      '000110' +
      '000110',
  },
  {
    id: 'diag', name: 'Diagonal', w: 4, h: 4, cell: 3, small: true, cells:
      '1100' +
      '0110' +
      '0011' +
      '1001',
  },
  {
    id: 'grid', name: 'Windowpane', w: 4, h: 4, cell: 3, cells:
      '1111' +
      '1000' +
      '1000' +
      '1000',
  },
  {
    id: 'chevron', name: 'Chevron', w: 8, h: 4, cell: 2, cells:
      '10000001' +
      '01000010' +
      '00100100' +
      '00011000',
  },
  {
    /* Authored against the render, not on paper: the first camo was a set of
       parallel blobs and read as another diagonal next to `diag` in the picker.
       Blobs on two different axes with unequal spacing is what stops the eye
       finding the repeat. */
    id: 'camo', name: 'Camo', w: 8, h: 8, cell: 2, cells:
      '00011100' +
      '00111110' +
      '01111100' +
      '00011000' +
      '11000001' +
      '11100011' +
      '11000111' +
      '00000011',
  },
  {
    id: 'diamond', name: 'Diamonds', w: 8, h: 8, cell: 2, cells:
      '00010000' +
      '00111000' +
      '01111100' +
      '00111000' +
      '00010000' +
      '00000000' +
      '00000000' +
      '00000000',
  },
];

/* ═══ v2.3.1944: SHOES, AND WHY THEY GET FOUR TILES INSTEAD OF NINE ═══
 *
 * Owner: "Do the shoes too but in patterns that would look good at a small
 * size."
 *
 * A boot is 22-31px wide in the 256 frame -- about eight screen pixels, a
 * quarter of the chest -- so a tile that reads as a pattern on a shirt reads as
 * grey noise on a foot.  Rendered all nine on the real boot at three cell sizes
 * and looked: `stripe-v`, `stripe-h`, `check` and `diag` survive, because their
 * shapes are big, straight and high-contrast.  `dots`, `camo`, `diamond`,
 * `chevron` and `grid` all collapse into speckle -- the shapes are smaller than
 * the boot can show.  Those five are simply not offered for shoes rather than
 * offered and disappointing.
 *
 * The four that stay also run at a COARSER cell there.  At the authored cell a
 * boot gets four or five stripes and they mush together at display size; at
 * SHOE_CELL it gets two or three and they read.  Same tiles, sized for the
 * canvas they are on.
 */
export const SHOE_CELL = 4;

/** The tiles offered for a garment slot. */
export function patternsFor(slot) {
  return slot === 'shoes' ? PATTERN_CATALOG.filter((t) => t.small) : PATTERN_CATALOG;
}

const _BY_ID = Object.create(null);   /* CLAUDE.md rule 4 */
for (const p of PATTERN_CATALOG) _BY_ID[p.id] = p;

/* Every tile must actually be w*h cells; a typo here would tile garbage across
   every shirt in the game and there is no test that would notice on its own. */
for (const p of PATTERN_CATALOG) {
  if (p.cells.length !== p.w * p.h) {
    throw new Error(`pattern ${p.id}: ${p.cells.length} cells, expected ${p.w * p.h}`);
  }
}

/** Parse a stored/wire value ("stripe-v:3") into {tile, color}, or null.
 *  Anything unrecognised answers null, so a value forged by another player
 *  paints nothing rather than something unexpected — the same posture every
 *  other recolour catalog takes. */
export function parsePattern(s, slot) {
  if (typeof s !== 'string' || s.length > 32) return null;
  const i = s.indexOf(':');
  if (i < 1) return null;
  let tile = _BY_ID[s.slice(0, i)];
  const idx = Number(s.slice(i + 1));
  if (!tile || !Number.isInteger(idx) || idx < 1 || idx >= ART_PALETTE.length) return null;
  /* v2.3.1944: shoes take a curated subset at a coarser cell.  The check lives
     HERE rather than only in the picker so the two cannot disagree -- a value
     that arrives from another player naming a tile shoes do not offer paints
     nothing, exactly like an unknown id. */
  if (slot === 'shoes') {
    if (!tile.small) return null;
    tile = { ...tile, cell: SHOE_CELL };
  }
  return { tile, color: ART_PALETTE[idx], id: tile.id, colorIdx: idx };
}

/** The wire/storage form. */
export function formatPattern(id, colorIdx) {
  return _BY_ID[id] ? (id + ':' + colorIdx) : '';
}

/** True if this tile cell is inked. */
export function patternInk(tile, x, y) {
  return tile.cells.charCodeAt((y % tile.h) * tile.w + (x % tile.w)) === 49; /* '1' */
}

/* ── selection store (localStorage) ──
   Two slots, because a shirt and a pair of trousers are separately chosen.
   Same shape as the drawing store next door, deliberately: the creator wires
   both through one subscription. */
const SLOTS = ['shirt', 'pants', 'shoes'];
const STORAGE_KEY = { shirt: 'bt-shirtpat', pants: 'bt-pantspat', shoes: 'bt-shoespat' };
const _active = Object.create(null);   /* CLAUDE.md rule 4 */
for (const k of SLOTS) {
  _active[k] = '';
  try {
    const saved = typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY[k]);
    if (saved && parsePattern(saved, k)) _active[k] = saved;
  } catch (e) { /* localStorage unavailable (SSR / privacy mode) */ }
}

const _listeners = new Set();

/** The raw stored value for a slot ('' = plain). */
export function getPattern(slot) { return _active[slot] || ''; }

/** The parsed pattern for a slot, or null when plain — what renderers want. */
export function patternFor(slot) { return parsePattern(getPattern(slot), slot); }

/** Set + persist. '' clears it back to a plain garment. */
export function setPattern(slot, value) {
  if (!STORAGE_KEY[slot]) return;
  const v = (value && parsePattern(value, slot)) ? value : '';
  if (v === _active[slot]) return;
  _active[slot] = v;
  try { localStorage.setItem(STORAGE_KEY[slot], v); } catch (e) { /* ignore */ }
  _listeners.forEach((fn) => { try { fn(slot, v); } catch (e) { /* ignore */ } });
}

export function onPatternChange(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

/** Sanitise a value that arrived from ANOTHER player: returns the string only
 *  if this catalog recognises it for that slot, otherwise ''. */
export function sanitizePattern(s, slot) { return parsePattern(s, slot) ? s : ''; }

/* A short, stable key segment for a texture cache.  Already short — the value
   IS the key — but wrapped so call sites do not have to know that. */
export function patternKey(s, slot) { return sanitizePattern(s, slot) || 'none'; }
