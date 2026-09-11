/* ═══ v2.3.2463: THE GRAB HANDLE, DRAWN ONCE ═══
 *
 * Owner: "make it more obvious that the handle resizes whatever is placed
 * (like two diagonal arrows and larger)."
 *
 * It was a gold ring with a dot in it, about two-thirds of a cell across.  A
 * ring says "something is here"; it does not say what dragging it will do, and
 * on a grid already covered in gold selection outline it reads as one more
 * piece of the outline.  Two arrowheads on the corner-to-corner diagonal is the
 * glyph every image editor uses for exactly this, and it points along the axis
 * the drag actually moves -- the box's near corner is anchored and the far one
 * follows your finger, so the motion IS that diagonal.
 *
 * WHY A MODULE AND NOT TWO COPIES.  The handle is drawn twice, on two canvases
 * in two files: the flat grid in PlayerPaint and the body surface in BodyInk.
 * They were the same fifteen lines pasted twice and had already drifted (radius
 * floor 7 on one, 9 on the other).  One function means the thing you learn to
 * grab on the shirt is the same thing on the skin, and a future change to it
 * cannot land on only one of them.
 *
 * `r` IS THE RADIUS THE CALLER WANTS, not a target: both callers size it from
 * their own cell size, which differs by a zoom on one surface and not the other.
 * The floor each passes is what keeps it thumb-sized when a cell is tiny.
 */

/**
 * Draw the selection's grab handle centred on (cx, cy).
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx  centre, in the canvas's own pixels
 * @param {number} cy
 * @param {number} r   outer radius
 * @param {boolean} resize  true for the resize glyph (two diagonal arrows);
 *        false for the plain ring a MOVE-only handle wears -- a legacy letter
 *        has no box to resize and its handle moves it instead, and drawing
 *        resize arrows on it would be a lie about what the drag does.
 */
export function drawGrabHandle(ctx, cx, cy, r, resize) {
  ctx.save();
  /* The dark disc first: the handle sits on top of the drawing, and gold on
     gold (a yellow shape under it) has no edge without something behind it. */
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(10,14,18,.72)';
  ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.16);
  ctx.strokeStyle = '#D8AA58';
  ctx.stroke();

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#D8AA58';

  if (!resize) {
    /* MOVE ONLY: the dot it has always had. */
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(2, r * 0.26), 0, Math.PI * 2);
    ctx.fillStyle = '#D8AA58';
    ctx.fill();
    ctx.restore();
    return;
  }

  /* RESIZE: shaft + two heads on the NW-SE diagonal, which is the corner this
     handle always sits on (the box's far corner, `handleCell`).  Round caps so
     the arms still read at the size a cell collapses to on the body surface. */
  const d = r * 0.46;                       /* half the shaft, on each axis */
  const a = Math.max(2.5, r * 0.34);        /* arrowhead arm length */
  ctx.lineWidth = Math.max(1.8, r * 0.155);
  ctx.beginPath();
  ctx.moveTo(cx - d, cy - d);
  ctx.lineTo(cx + d, cy + d);
  /* SE head: two arms back along the axes from the tip */
  ctx.moveTo(cx + d, cy + d); ctx.lineTo(cx + d - a, cy + d);
  ctx.moveTo(cx + d, cy + d); ctx.lineTo(cx + d, cy + d - a);
  /* NW head */
  ctx.moveTo(cx - d, cy - d); ctx.lineTo(cx - d + a, cy - d);
  ctx.moveTo(cx - d, cy - d); ctx.lineTo(cx - d, cy - d + a);
  ctx.stroke();
  ctx.restore();
}

/* How big the handle is, given the cell size it sits on.  Exported so the two
   surfaces and the hit test cannot disagree about it -- the circle you can see
   and the circle that answers your finger were separate numbers before, and the
   visible one grew here (v2.3.2463) while the other did not. */
export const HANDLE_R = (cell, floor) => Math.max(floor, cell * 0.95);
/** The finger's reach for it: always wider than the glyph. */
export const HANDLE_HIT = (cell, floor) => Math.max(floor, cell * 1.6);
