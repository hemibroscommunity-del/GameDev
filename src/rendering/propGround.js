/* ═══════════════════════════════════════════════════════════════════════
   v2.3.2748: WHERE A BUILDING'S ART ACTUALLY MEETS THE GROUND

   Owner, with four screenshots of the town: "Fix layer detection for props.
   Right now it's really bad at detecting contact and when the player should
   appropriately show in front or behind the layer.  Jogging against a prop
   seems to be some of the most problematic."

   Two separate faults were in those pictures.  The first is the player's own
   ground line (depthSort.js, and the feet in pixiRenderer's call).  This file
   is the second: A BUILDING DOES NOT TOUCH THE GROUND ALONG ONE LINE.

   depthSort's rule has always been "a prop stands on its ground-contact line,
   which is its sprite's bottom edge" -- one horizontal y, the lowest opaque
   row of the art.  That is exactly right for a lamp, a bench, a person.  It is
   wrong for every building in town, because the owner's building art is drawn
   in three-quarter ISOMETRIC view: the base is a diamond, not a line.  The
   auction house touches the ground at its front step (the lowest point, which
   is what the old rule used) and ALSO along two walls that climb away from it
   to a left corner 126 px further up the screen and a right corner 77 px up.
   Stand beside that left corner -- screenshot four -- and you are plainly in
   front of the wall next to you, but 60 px north of the front step, so the
   whole building was drawn over you.

   THE FIX READS THE BASE OFF THE ART.  For each column of the picture, the
   lowest opaque pixel is where that column meets the ground: the diamond's
   two front walls come out as a V, a flat-fronted stall as a flat line, the
   weapon rack beside the forge at its own feet.  No per-building numbers to
   measure or keep in step with the art -- replace a picture and its base
   comes with it.

   WHERE THE PROFILE IS USED, AND WHERE IT IS NOT.  Only BESIDE the prop's
   footprint (outside its blockW span).  Across the span itself the flat line
   is already exact, because nobody stands inside a footprint: you are either
   north of it (behind the building) or south of it (in front).  Beside it is
   where the V matters -- that is where a figure can stand level with a wall
   that recedes -- and also where the one weakness of reading a base off a
   picture cannot bite: a column whose lowest pixel is NOT on the ground (a
   hanging sign, an eave) only ever sits out at the art's edge, and a figure
   standing under one is correctly in front of it anyway.

   COST.  Measured once per prop, off a 128-column copy of the picture, on
   the first frames the prop is drawn -- one prop per frame, so a zone of
   buildings costs a millisecond or two spread over its first frames rather
   than one hitch.  Until a prop's profile is ready it uses the flat line,
   which is what every prop used before this file existed.
   ═══════════════════════════════════════════════════════════════════════ */

/* How wide the copy is.  At the town's scales one column is ~4 world px --
   finer than a foot, and the whole read is a 64 KB image. */
const COLS = 128;
/* An art pixel is solid from here up.  The painted bases fade out over two
   or three pixels of antialiasing and grass; half-coverage is where the eye
   puts the edge. */
const SOLID = 128;
/* How far either side of a figure's feet to look for art when the column
   under them is empty, in world px: about half a figure's width, so a figure
   just past a building's edge still sorts against the edge its body
   overlaps. */
const REACH = 24;

let _canvas = null;
let _ctx = null;
let _budgetFrame = -1;

function ctx2d() {
  if (_ctx) return _ctx;
  if (typeof document === 'undefined') return null;
  try {
    _canvas = document.createElement('canvas');
    _ctx = _canvas.getContext('2d', { willReadFrequently: true });
  } catch (e) { _ctx = null; }
  return _ctx;
}

/**
 * Per column of `texture`'s frame, the row (as a fraction 0-1 of the frame's
 * height, from the top) just below its lowest solid pixel; -1 for a column
 * with no solid pixel at all.  Null when the picture cannot be read (no DOM,
 * a compressed or GPU-only source) -- callers then keep the flat line.
 *
 * v2.3.2787: `extras` -- pictures drawn over it before it is read, each
 * `{ texture, x, y }` at its top-left in `texture`'s frame px.  worldLife
 * cuts a building's signs, scales and flags out of its picture so they can
 * swing, and puts them back here, where they were cut from, so the building
 * reads the same base off its art as it did whole.  Without them the auction
 * house's edge columns (the sign's, the scales') read EMPTY, which moved its
 * base line beside the scales and took the long shadow its sign throws
 * (lightfx/shadows.js places a building's pixels on these columns).
 */
export function readArtBottoms(texture, extras) {
  const c = ctx2d();
  const src = texture && texture.source;
  const res = src && src.resource;
  const fr = texture && texture.frame;
  if (!c || !res || !fr || !(fr.width > 0) || !(fr.height > 0)) return null;
  /* frame is in the source's point units; the resource is in pixels */
  const k = (src.pixelWidth && src.width) ? src.pixelWidth / src.width : 1;
  const W = Math.max(1, Math.min(COLS, Math.round(fr.width * k)));
  const H = Math.max(1, Math.min(COLS * 2, Math.round((fr.height / fr.width) * W)));
  try {
    _canvas.width = W; _canvas.height = H;
    c.clearRect(0, 0, W, H);
    c.drawImage(res, fr.x * k, fr.y * k, fr.width * k, fr.height * k, 0, 0, W, H);
    if (extras) {
      const sx = W / fr.width, sy = H / fr.height;
      for (let i = 0; i < extras.length; i++) {
        const e = extras[i];
        const t2 = e && e.texture, s2 = t2 && t2.source, r2 = s2 && s2.resource, f2 = t2 && t2.frame;
        if (!r2 || !f2) continue;
        const k2 = (s2.pixelWidth && s2.width) ? s2.pixelWidth / s2.width : 1;
        c.drawImage(r2, f2.x * k2, f2.y * k2, f2.width * k2, f2.height * k2, e.x * sx, e.y * sy, f2.width * sx, f2.height * sy);
      }
    }
    const px = c.getImageData(0, 0, W, H).data;
    const out = new Float32Array(W);
    for (let x = 0; x < W; x++) {
      out[x] = -1;
      for (let y = H - 1; y >= 0; y--) {
        if (px[(y * W + x) * 4 + 3] >= SOLID) { out[x] = (y + 1) / H; break; }
      }
    }
    return out;
  } catch (e) {
    return null;
  }
}

/**
 * The ground record a prop sprite carries for depthSort (`spr._propGround`).
 * Rebuilt when the sprite moves or rescales; the profile is attached later,
 * by settleProfile, one prop per frame.
 */
export function propGroundFor(spr, prop, footprint) {
  const t = spr.texture;
  const fr = t && t.frame;
  const g = spr._propGround || (spr._propGround = {
    id: prop.id, base: 0, x: 0, sx: 1, sy: 1, fw: 0, fh: 0,
    fp: null, bottoms: null, tried: false, halfW: 0,
  });
  g.base = spr.y;
  g.x = spr.x;
  g.sx = spr.scale.x;
  g.sy = spr.scale.y;
  g.fw = fr ? fr.width : 0;
  g.fh = fr ? fr.height : 0;
  g.fp = footprint || null;
  g.halfW = Math.abs(g.fw * g.sx) / 2;
  return g;
}

/** Measure one prop's profile if none has been measured this frame. */
export function settleProfile(g, texture, frameNo) {
  if (!g || g.tried || _budgetFrame === frameNo) return;
  _budgetFrame = frameNo;
  g.tried = true;
  g.bottoms = readArtBottoms(texture);
}

/**
 * v2.3.2749: the art's base at texture column fraction u (0-1), in world y --
 * the raw profile, with no footprint rule; the prop's own base where the
 * column is empty or the profile is not read yet.  For the shadow mesh.
 */
export function profileAtU(g, u) {
  const b = g && g.bottoms;
  if (!b) return g ? g.base : NaN;
  const W = b.length;
  const c = Math.max(0, Math.min(W - 1, Math.floor(u * W)));
  let best = NaN;
  for (let k = c - 1; k <= c + 1; k++) {
    if (k < 0 || k >= W) continue;
    const y = colBase(g, k);
    if (y === y && !(y <= best)) best = y;
  }
  return best === best ? Math.min(best, g.base) : g.base;
}

/* The world y of the art's base in column `col`, or NaN for an empty one. */
function colBase(g, col) {
  const v = g.bottoms[col];
  if (!(v >= 0)) return NaN;
  return g.base - (1 - v) * g.fh * g.sy;
}

/**
 * Where this prop meets the ground at world x -- the line a figure standing
 * at x must be SOUTH of to be drawn in front of it.  Never south of the
 * prop's own base (the lowest row of its art).
 */
export function groundLineAt(g, x) {
  if (!g) return NaN;
  const fp = g.fp;
  if (fp && x >= fp.x0 && x <= fp.x1) return g.base;
  const b = g.bottoms;
  if (!b || !(g.fw > 0) || !g.sx) return g.base;
  const W = b.length;
  const colW = Math.abs(g.fw * g.sx) / W;            /* world px per column */
  const u = (x - g.x) / (g.fw * g.sx) + 0.5;           /* 0-1 across the art; a mirrored prop reads mirrored */
  const c0 = Math.floor(u * W);
  /* The column under the feet, and one either side to take the jaggies off
     a painted edge -- the southernmost of the three.  Wider would be wrong
     on a slope: the diamond's walls climb ~0.55 px per px, so reading 24 px
     toward the front step would ask the figure to stand 13 px further south
     than the wall beside it actually is. */
  let best = NaN;
  for (let c = c0 - 1; c <= c0 + 1; c++) {
    if (c < 0 || c >= W) continue;
    const y = colBase(g, c);
    if (y === y && !(y <= best)) best = y;
  }
  /* Nothing painted under the feet (past the art's edge, or a gap in it):
     the nearest painted column within half a figure's width, because that is
     the art the figure's body overlaps. */
  if (best !== best) {
    const r = Math.max(1, Math.round(REACH / colW));
    for (let d = 2; d <= r && best !== best; d++) {
      const a = c0 - d >= 0 && c0 - d < W ? colBase(g, c0 - d) : NaN;
      const z = c0 + d >= 0 && c0 + d < W ? colBase(g, c0 + d) : NaN;
      if (a === a) best = a;
      if (z === z && !(z <= best)) best = z;
    }
  }
  if (best !== best) return g.base;                    /* no art near x: nothing to overlap, keep the old line */
  return Math.min(best, g.base);
}
