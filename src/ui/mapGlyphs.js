/* ═══ v2.3.3780: THE WORLD MAP'S MARKS SAY WHAT THEY ARE ═══
 *
 * The owner, 2026-10-28: "Also the legend icons for the map are terrible.
 * Those all need different colors and shapes that actually more closely align
 * with what it's describing / To be clear I'm referring to this screenshot
 * where monster is red dot, fish is white dot, etc".
 *
 * The world map (WorldMapOverlay.jsx) marked most things with a dot, and its
 * key repeated the dots: a red one a monster, a white one a fish, an orange
 * one ore, a green one a tree or a bro.  Now each is a small picture of the
 * thing -- a horned head, a fish, a tree, a rock with a fleck of metal, a
 * person, an arch, a flag, a tent, two peaks with a gap, a house -- so the
 * SHAPE says what it is (colour-blind safe) and the colour agrees.
 *
 * Each glyph is SVG path data in a 16 x 16 box centred on (8, 8):
 *   - `body`, filled with the glyph's colour (or the caller's tint: a
 *     resource's tier), outlined in the map's dark halo so it reads on any
 *     ground;
 *   - `detail`, filled over it in `detailColor` (the dark ink, or the
 *     trunk's brown): eyes, a door, a tent's opening, the fish's eye.
 * The map draws them through Path2D objects built once (glyphPath) and the
 * key draws the same strings as SVG (WorldMapOverlay.jsx Key), so the map and
 * its key can never disagree.  Nothing is a picture: no memory to budget.
 */

export const GLYPH_HALO = 'rgba(11,22,27,0.92)';
const INKD = '#14232A';   /* the details: dark, as the halo */

export const GLYPHS = Object.freeze({
  /* a house: roof, walls, a door */
  town: {
    color: '#F4F0E7',
    body: 'M1.5 8.2 L8 2 L14.5 8.2 L13 8.2 L13 14.5 L3 14.5 L3 8.2 Z',
    detail: 'M6.6 14.5 L6.6 10.4 L9.4 10.4 L9.4 14.5 Z',
  },
  /* a tent, its flap open */
  camp: {
    color: '#EAC675',
    body: 'M8 1.5 L15 14.5 L1 14.5 Z',
    detail: 'M8 7.5 L10.4 14.5 L5.6 14.5 Z',
  },
  /* two peaks and the gap between them */
  pass: {
    color: '#D9DEE2',
    body: 'M0.8 14.5 L4.8 3.5 L7.3 9.5 L8.7 9.5 L11.2 3.5 L15.2 14.5 Z',
    detail: 'M3.6 6.8 L4.8 3.5 L6 6.8 L4.8 6.1 Z M10 6.8 L11.2 3.5 L12.4 6.8 L11.2 6.1 Z',
    detailColor: '#FFFFFF',
  },
  /* an arch: the way through */
  gate: {
    color: '#C58CFF',
    body: 'M1.5 14.5 L1.5 7.5 A6.5 6.5 0 0 1 14.5 7.5 L14.5 14.5 Z',
    detail: 'M4.6 14.5 L4.6 8.2 A3.4 3.4 0 0 1 11.4 8.2 L11.4 14.5 Z',
  },
  /* a flag on its pole */
  landmark: {
    color: '#7FE0B4',
    body: 'M2.6 1.2 L4.6 1.2 L4.6 2 L13.8 4.8 L4.6 8.4 L4.6 14.8 L2.6 14.8 Z',
  },
  /* a horned head: the monsters */
  monster: {
    color: '#E35D5B',
    body: 'M1.2 1.2 L5.2 4.4 A6 6 0 0 1 10.8 4.4 L14.8 1.2 L13.4 7 A5.6 5.6 0 0 1 13.6 9.2 C13.6 12.4 11.2 14.8 8 14.8 C4.8 14.8 2.4 12.4 2.4 9.2 A5.6 5.6 0 0 1 2.6 7 Z',
    detail: 'M4.4 8 L7.2 9.2 L6.8 10.8 L4.6 10.1 Z M11.6 8 L8.8 9.2 L9.2 10.8 L11.4 10.1 Z M5.8 12.2 L10.2 12.2 L9.5 13.4 L6.5 13.4 Z',
  },
  /* a fish, swimming left */
  fish: {
    color: '#79C4F2',
    body: 'M0.8 8 C3 3.8 8.4 3.6 11.4 7 L15.2 3.8 L14.2 8 L15.2 12.2 L11.4 9 C8.4 12.4 3 12.2 0.8 8 Z',
    detail: 'M3.4 7.2 A1.1 1.1 0 1 0 5.6 7.2 A1.1 1.1 0 1 0 3.4 7.2 Z',
  },
  /* a round tree on its trunk */
  tree: {
    color: '#58B85A',
    body: 'M8 0.8 C11.6 0.8 14 3.4 14 6.6 C14 9.6 11.8 11.4 9.2 11.6 L9.2 15.2 L6.8 15.2 L6.8 11.6 C4.2 11.4 2 9.6 2 6.6 C2 3.4 4.4 0.8 8 0.8 Z',
    detail: 'M6.8 11.6 L9.2 11.6 L9.2 15.2 L6.8 15.2 Z',
    detailColor: '#8A5A32',
  },
  /* a rock with a fleck of metal (the fleck is the ore's tier colour) */
  ore: {
    color: '#9AA4AE',
    body: 'M1.5 12.8 L3 6 L6.8 2.6 L12 3.6 L14.8 8.6 L13.4 14 L3.6 14.6 Z',
    detail: 'M4.6 6.4 L9.4 4.8 L11 8.6 L6.6 10.4 Z M9.6 10.4 L12.8 9.4 L13.2 12.4 L10 12.9 Z',
    detailColor: '#E08A45',
  },
  /* a person: the other bros */
  bro: {
    color: '#58B97B',
    body: 'M8 1 A3 3 0 1 1 7.99 1 Z M2.6 15.2 C2.6 10.6 4.8 8.2 8 8.2 C11.2 8.2 13.4 10.6 13.4 15.2 Z',
  },
});

/* the key's order and words (the map's legend, WorldMapOverlay.jsx) */
export const GLYPH_WORDS = Object.freeze({
  town: 'town', camp: 'camp', pass: 'pass', gate: 'gate', landmark: 'landmark',
  monster: 'monster', fish: 'fish', tree: 'tree', ore: 'ore', bro: 'bro',
});

/* Path2D objects, built once a glyph (never per frame); null where a canvas
   has none (node) */
const _paths = Object.create(null);
export function glyphPath(kind, part) {
  const key = kind + ':' + part;
  if (key in _paths) return _paths[key];
  const G = GLYPHS[kind];
  const d = G && G[part];
  let p = null;
  try { if (d && typeof Path2D === 'function') p = new Path2D(d); } catch (e) { p = null; }
  _paths[key] = p;
  return p;
}

/**
 * Draw a glyph on a 2D canvas, centred on (x, y), `size` CSS px across.
 * `tint` replaces the body's colour (a tree's or fish's tier), `detailTint`
 * the detail's (the ore's fleck).  Returns false where it could not draw.
 */
export function drawGlyph(g, kind, x, y, size, tint, detailTint) {
  const G = GLYPHS[kind];
  const body = glyphPath(kind, 'body');
  if (!G || !body || !g) return false;
  const k = size / 16;
  g.save();
  g.translate(x - 8 * k, y - 8 * k);
  g.scale(k, k);
  g.lineJoin = 'round';
  g.lineWidth = Math.max(2.2, 2.6 / Math.max(0.6, k));   /* about 2 px of halo on screen */
  g.strokeStyle = GLYPH_HALO;
  g.stroke(body);
  g.fillStyle = tint || G.color;
  g.fill(body);
  const det = G.detail ? glyphPath(kind, 'detail') : null;
  if (det) { g.fillStyle = detailTint || G.detailColor || INKD; g.fill(det); }
  g.restore();
  return true;
}

/** The detail's colour as the key draws it (the dark ink unless named). */
export function glyphDetailColor(kind) {
  const G = GLYPHS[kind];
  return (G && G.detailColor) || INKD;
}
