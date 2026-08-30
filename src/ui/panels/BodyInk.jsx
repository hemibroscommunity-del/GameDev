import React from 'react';
import { ART_W, ART_H, ART_PALETTE } from '@/rendering/traits/playerArt.js';
import { cellAt } from '@/rendering/playerDecal.js';   /* v2.3.1962 */
import { drawCharacterPortrait } from '@/rendering/characterPortrait.js';

/* ═══ v2.3.1965: TATTOO THE BODY, NOT A GRID ═══
 *
 * Owner, play-testing: "In the tattoo editor I think it would be better if you
 * just allowed the user to zoom in on any part of the character skin to tattoo
 * it. With the live preview of what it looks like on the character. So you
 * don't have to do any mental calculations of what your design looks like.
 * You're just making the tattoo on whatever zoomed in body part you want
 * (including forehead etc)."
 *
 * Exactly the right complaint. The flat editor asks you to draw in a 16x16
 * abstraction and then discover, on a 125px preview, that your design landed
 * three cells lower than you meant and half of it fell off the arm. This
 * surface removes the abstraction: it IS the character, zoomed, and your
 * finger inks the pixel it is on.
 *
 * ── HOW A FINGER FINDS A CELL ──
 * Three transforms, composed, all of them reported by the code that owns them
 * rather than re-derived here:
 *
 *   box px  --(this file's zoom/pan window)-->  portrait px
 *           --(canvas.__btGridXform, v2.3.1965)-->  body-sheet px
 *           --(cellAt + the reported grid, v2.3.1962)-->  cell
 *
 * The middle one is the one that used to be a trap: the portrait applies a
 * mirror, a per-direction zoom tweak, a 10px drop, PORTRAIT_FIT and the
 * build's two axes before it draws the body, and a caller re-deriving that
 * chain mis-hits silently the moment any of the six is tuned. So the portrait
 * now hands over the matrix it actually used.
 *
 * ── WHICH REGION YOU ARE ON ──
 * The three skin canvases are separate drawings, so a touch has to choose one.
 * It is decided by the REGION BBOX in the grid report (the extent of the skin
 * mask itself), not by the grid box: an arm's grid is forced to a 16px minimum
 * width and is therefore wider than the arm, so the grid box alone would claim
 * chest pixels beside the shoulder. Priority face > arms > chest breaks the
 * remaining tie, because the arm bboxes sit inside the chest's at its edges.
 *
 * ── WHY THE STROKE IS DRAWN TWICE ──
 * Re-compositing the figure costs a measured 7ms (p90 12ms) on desktop and
 * several times that on the phone this is built for, so it is coalesced to one
 * per frame like WornPreview's. That is fine for the TRUTH and much too slow
 * for the FEEDBACK, so a gesture paints a cheap overlay immediately and the
 * composite catches up behind it. The finger never waits for a sheet to bake.
 *
 * ── ZOOM WITHOUT A SECOND FINGER ──
 * Pinch works, but every gesture here is also reachable one-handed: a pan
 * toggle turns the drag into a pan, and the +/- buttons zoom. The primary
 * platform is a phone held in one hand, and a two-finger-only zoom is a
 * feature that does not exist for the person carrying a coffee.
 *
 * ═══ v2.3.1994: THE SAME EDITOR AS THE SHIRT, ON THE CHARACTER ═══
 *
 * Owner: "Oh I see the shirt editor is where the more complex editor is. Make
 * the skin tattoo editor be the same as that but I do like the zoom ability of
 * the face and torso one so add that."
 *
 * So this file stopped owning a tool. It used to be a pen and an eraser and
 * nothing else — it collected a stroke's cells itself and handed them to the
 * panel as one finished op — which is why the panel hid the shapes, the
 * letters, the layer row and the shape handles whenever it was on screen: the
 * surface underneath them could not do any of it.
 *
 * It is a SURFACE now. It answers exactly one question — "which cell of which
 * skin canvas is this pointer on?" — and forwards the raw pointer events to
 * PlayerPaint, whose existing tool handlers already work in cell space and
 * therefore work here unchanged. Every tool the shirt has now works on the
 * body, including the ones that were never possible before (a rectangle drawn
 * ON the chest, a letter placed ON the arm), and there is one implementation
 * of each rather than two that drift.
 *
 * What stays here is what is genuinely about the surface: the composite, the
 * zoom/pan window, the grid overlay, and painting the selection, the handle
 * and the in-flight ink over the top so the finger never waits.
 */

const MIN_Z = 1;
/* v2.3.1994: 32, not 16 (owner: "When you try to zoom way in to draw detail").
   At 16 the visible window is 1/16 of the 512px composite — 32 composite px,
   which is a hair under the whole head, so "way in" ran out exactly where the
   detail work starts. 32 halves that again; past it the window is narrower
   than a single 16x16 cell is wide on the arm, which is not a view of
   anything. */
const MAX_Z = 32;
/* How much of the editor the framed region fills. Short of 1 so the region's
   own edges are reachable with a finger rather than pinned to the bezel. */
const FIT = 0.86;

/* Region priority, most specific first — see "WHICH REGION YOU ARE ON". */
const REGIONS = [
  { key: 'face',   target: 'tattooFace', label: 'Face' },
  { key: 'arms',   target: 'tattooArm',  label: 'Arms' },
  { key: 'tattoo', target: 'tattoo',     label: 'Chest' },
];
/* v2.3.2150: front canvas -> its back counterpart, and back -> the front
   REGION it is drawn on. Both directions are needed and they are not the same
   question: the first is "which canvas does this touch write to", the second is
   "which part of the figure is that canvas drawn over". */
const BACK_TARGET = { tattoo: 'tattooBack', tattooFace: 'tattooHeadBack' };
const FRONT_OF = { tattooBack: 'tattoo', tattooHeadBack: 'tattooFace' };
const keyForTarget = (t) => {
  /* A back canvas has NO region of its own -- the surface frames a
     front-facing figure and there is no back to hit-test -- so it borrows the
     grid of the part it covers. Without this fold, keyForTarget answered null
     for 'tattooBack', gridFor found no grid, and every stroke on the back was
     silently DROPPED: mp-bodyink saw the chest correctly left alone and the
     back never written, which reads as "the switch does nothing". */
  const key = FRONT_OF[t] || t;
  const r = REGIONS.find((q) => q.target === key);
  return r ? r.key : null;
};

/* ═══ v2.3.1994: WHAT EACH TAB REACHES ═══
 * Owner: "Can you just make anywhere where skin is showing be tattooable?"
 *
 * v2.3.1978 narrowed a touch to the ONE region the tab names, and with two
 * tabs that left the ARMS with no editor at all — a whole pair of limbs of
 * plainly visible skin that no gesture on any screen could reach. That is half
 * the owner's report on its own.
 *
 * The tab is a FRAMING now, not a fence: Body frames the torso and both arms
 * and a touch lands on whichever of them it is over; Face frames the head.
 * Between the two, and with the full-region grids v2.3.1994 gives them
 * (playerDecal's three skin boxes), there is no skin pixel on the character
 * that a finger cannot ink. Which is what was asked for.
 *
 * Ordered by priority: arms before chest, because an arm's bbox sits inside
 * the chest's at the shoulder.
 */
const TAB_REGIONS = {
  tattoo: ['arms', 'tattoo'],
  face: ['face'],
};

/** Invert a 2D affine matrix applied as x' = a·x + c·y + e. */
function unproject(m, x, y) {
  const det = m.a * m.d - m.b * m.c;
  if (!det) return null;
  const dx = x - m.e, dy = y - m.f;
  return { x: (dx * m.d - dy * m.c) / det, y: (dy * m.a - dx * m.b) / det };
}

export default function BodyInk({
  look, arts, ink = 1, dir = 'south', region = 'tattoo',
  /* v2.3.1994: the panel drives the tools; this surface reports cells. */
  apiRef = null, activeTarget = 'tattoo',
  onRegion, onDown, onMove, onUp,
  /* v2.3.2150: true while the panel is drawing on the character's BACK. The
     surface still frames a front-facing figure -- there is no back-view art to
     paint on -- so the touch REGIONS are unchanged and only the canvas each one
     writes to moves. That is the whole reason a back canvas needed a switch
     rather than a place to touch. */
  backSide = false,
  overlayCells = null, selCells = null, handleCell = null,
}) {
  const boxRef = React.useRef(null);
  const offRef = React.useRef(null);
  const busyRef = React.useRef(false);
  const dirtyRef = React.useRef(false);
  const kickRef = React.useRef(null);

  /* What the last composite reported: the per-region grids and the matrix that
     maps the body sheet onto the offscreen canvas. */
  const gridsRef = React.useRef(null);
  const xformRef = React.useRef(null);

  /* The view window, in offscreen-canvas fractions. cx/cy is its centre. */
  const [view, setView] = React.useState({ z: 2.2, cx: 0.5, cy: 0.34 });
  const viewRef = React.useRef(view);
  viewRef.current = view;

  const [pan, setPan] = React.useState(false);
  const panRef = React.useRef(pan); panRef.current = pan;

  /* Live gesture state. Refs, not state: a pointermove handler must read the
     CURRENT values, and a state value captured in its closure is a render
     behind (the same reason the flat editor keeps its draft in a ref). */
  const gestureRef = React.useRef(null);   /* the TARGET canvas this gesture is on */
  const ptrsRef = React.useRef(new Map());
  const pinchRef = React.useRef(null);
  const artsRef = React.useRef(arts);
  artsRef.current = arts;

  /* ── the window this view maps onto the offscreen canvas ──────────────── */
  const windowFor = React.useCallback((off, v) => {
    const S = off.width;
    const sw = S / v.z, sh = off.height / v.z;
    /* Clamped so the figure cannot be dragged off the surface entirely. */
    const cx = Math.max(sw / 2 / S, Math.min(1 - sw / 2 / S, v.cx));
    const cy = Math.max(sh / 2 / off.height, Math.min(1 - sh / 2 / off.height, v.cy));
    return { sx: cx * S - sw / 2, sy: cy * off.height - sh / 2, sw, sh };
  }, []);

  /* Which regions this tab can reach, in priority order. */
  const tabKeys = TAB_REGIONS[region] || TAB_REGIONS.tattoo;

  /* ── box pixel -> body-sheet pixel ─────────────────────────────────────── */
  const sheetAt = React.useCallback((clientX, clientY) => {
    const box = boxRef.current, off = offRef.current;
    const m = xformRef.current;
    if (!box || !off || !off.width || !m) return null;
    const r = box.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    const w = windowFor(off, viewRef.current);
    const ox = w.sx + ((clientX - r.left) / r.width) * w.sw;
    const oy = w.sy + ((clientY - r.top) / r.height) * w.sh;
    return unproject(m, ox, oy);
  }, [windowFor]);

  /* Which of this tab's regions a sheet point is inside, by the region's own
     bulk bbox (NOT the grid box — see "WHICH REGION YOU ARE ON"). */
  const regionAt = React.useCallback((p) => {
    const grids = gridsRef.current;
    if (!grids || !p) return null;
    for (let i = 0; i < tabKeys.length; i++) {
      const list = grids[tabKeys[i]] || [];
      for (let k = 0; k < list.length; k++) {
        const g = list[k];
        if (p.x >= g.lx && p.x <= g.rx + 1 && p.y >= g.ty && p.y <= g.by + 1) {
          const R = REGIONS.find((q) => q.key === tabKeys[i]);
          let tgt = R ? R.target : 'tattoo';
          /* v2.3.2150: the same touch, the other side. Arms are deliberately
             NOT remapped -- an arm is the same arm from behind, which is why
             artForFacing leaves that canvas alone (playerSkins, v2.3.2148); a
             second arm drawing for the back view would be a canvas nothing
             renders. */
          if (backSide) tgt = BACK_TARGET[tgt] || tgt;
          return { key: tabKeys[i], target: tgt, grid: g };
        }
      }
    }
    return null;
    /* v2.3.2150: `backSide` is a DEPENDENCY, not just a read. Left out of this
       list it is captured once and never updated, so flipping the switch
       changed the label and nothing else -- mp-bodyink caught exactly that: with
       Back selected, a tap on the torso still inked the CHEST. cellFor below
       depends on this callback, so the stale value reached every gesture. */
  }, [tabKeys, backSide]);

  /* ── v2.3.1994: THE SURFACE'S ONE ANSWER ────────────────────────────────
     Which cell of which canvas is this pointer on?  `clamp` pins a drag that
     has wandered off the region to the nearest cell instead of dropping it —
     the same contract PlayerPaint's flat `cellAt` has, so the panel's tool
     handlers cannot tell the two surfaces apart.

     `lock` is the canvas a gesture already committed to: a rectangle dragged
     from the chest must keep measuring against the CHEST's grid even when the
     far corner is over an arm, or the shape would change size by changing
     which body part it is nearest. */
  const cellFor = React.useCallback((e, clamp, lock) => {
    const grids = gridsRef.current;
    const p = sheetAt(e.clientX, e.clientY);
    if (!p || !grids) return null;
    let g = null;
    if (lock) {
      const key = keyForTarget(lock);
      const list = (key && grids[key]) || [];
      /* The piece the point is in, or — for a clamped drag off the edge — the
         piece whose grid it is nearest.  An arm pair reports two. */
      let best = null, bestD = Infinity;
      for (let k = 0; k < list.length; k++) {
        const q = list[k];
        const cx = q.ox + ART_W * q.cw / 2, cy = q.oy + ART_H * q.ch / 2;
        const d = Math.hypot(p.x - cx, p.y - cy);
        if (p.x >= q.lx && p.x <= q.rx + 1 && p.y >= q.ty && p.y <= q.by + 1) { best = q; break; }
        if (d < bestD) { bestD = d; best = q; }
      }
      g = best;
    } else {
      const hit = regionAt(p);
      g = hit && hit.grid;
    }
    if (!g) return null;
    const target = lock || (regionAt(p) || {}).target;
    if (!target) return null;
    const c = cellAt(g, p.x, p.y);
    if (c) return { target, gx: c.gx, gy: c.gy };
    if (!clamp) return null;
    const gx = Math.max(0, Math.min(ART_W - 1, Math.floor((p.x - g.ox) / g.cw)));
    const gy = Math.max(0, Math.min(ART_H - 1, Math.floor((p.y - g.oy) / g.ch)));
    return { target, gx, gy };
  }, [sheetAt, regionAt]);

  /* sheet px -> box px, for every overlay this file paints and for the handle
     hit test the panel runs. Kept as a factory so the caller pays for the
     window lookup once per pass. */
  const toBoxFn = React.useCallback(() => {
    const box = boxRef.current, off = offRef.current, m = xformRef.current;
    if (!box || !off || !off.width || !m) return null;
    const win = windowFor(off, viewRef.current);
    const w = box.width, h = box.height;
    return (sx, sy) => ({
      x: ((m.a * sx + m.c * sy + m.e) - win.sx) / win.sw * w,
      y: ((m.b * sx + m.d * sy + m.f) - win.sy) / win.sh * h,
    });
  }, [windowFor]);

  /* The grid a given canvas is drawn on right now. The first piece: an arm
     pair reports two and a handle belongs to the drawing, which is stamped on
     both — the near one is the one to point at. */
  const gridFor = React.useCallback((target) => {
    const grids = gridsRef.current;
    const key = keyForTarget(target);
    const list = (grids && key && grids[key]) || [];
    return list.length ? list[0] : null;
  }, []);

  /* ── the imperative surface the panel drives ──────────────────────────── */
  React.useEffect(() => {
    if (!apiRef) return undefined;
    apiRef.current = {
      /* The panel's tool handlers call this exactly the way the flat grid's
         own `cellAt` is called.  The gesture's locked canvas is read from the
         ref HERE rather than passed in, so a handler can never hold a stale
         copy of which body part it started on. */
      cellAt: (e, clamp) => cellFor(e, clamp, gestureRef.current),
      /* Where a cell's centre is on the GLASS, so the panel's handle hit test
         works in client coordinates exactly as it does on the flat grid. */
      cellCenter(target, gx, gy) {
        const box = boxRef.current, g = gridFor(target), toBox = toBoxFn();
        if (!box || !g || !toBox) return null;
        const r = box.getBoundingClientRect();
        if (!r.width || !box.width) return null;
        const k = r.width / box.width;                 /* backing store -> CSS */
        const a = toBox(g.ox + gx * g.cw, g.oy + gy * g.ch);
        const b = toBox(g.ox + (gx + 1) * g.cw, g.oy + (gy + 1) * g.ch);
        return {
          x: r.left + (a.x + b.x) / 2 * k,
          y: r.top + (a.y + b.y) / 2 * k,
          w: Math.abs(b.x - a.x) * k,
          h: Math.abs(b.y - a.y) * k,
        };
      },
    };
    return () => { apiRef.current = null; };
  }, [apiRef, cellFor, gridFor, toBoxFn]);

  /* ── blit: offscreen -> visible, plus the grid and the live overlays ───── */
  const blit = React.useCallback(() => {
    const box = boxRef.current, off = offRef.current;
    if (!box || !off || !off.width) return;
    const cssW = box.clientWidth, cssH = box.clientHeight;
    if (!cssW || !cssH) return;
    const dpr = Math.min(2, Math.round((typeof window !== 'undefined' && window.devicePixelRatio) || 1));
    const w = Math.round(cssW * dpr), h = Math.round(cssH * dpr);
    if (box.width !== w || box.height !== h) { box.width = w; box.height = h; }
    const ctx = box.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, w, h);
    const win = windowFor(off, viewRef.current);
    ctx.drawImage(off, win.sx, win.sy, win.sw, win.sh, 0, 0, w, h);

    const grids = gridsRef.current, m = xformRef.current;
    if (!grids || !m) return;
    /* sheet px -> box px, for the overlay */
    const toBox = (sx, sy) => ({
      x: ((m.a * sx + m.c * sy + m.e) - win.sx) / win.sw * w,
      y: ((m.b * sx + m.d * sy + m.f) - win.sy) / win.sh * h,
    });

    /* v2.3.1965: where each region currently sits, in this canvas's own pixels.
       Stamped on the element the way characterPortrait stamps __btDir and
       __btGrids, and for the same reason: a probe cannot ask a ref.  It lets a
       scenario aim at the CHEST rather than at a guessed fraction of a view
       that is zoomed and panned — the aim stops being the thing under test and
       the mapping starts being it. */
    try {
      const aim = Object.create(null);
      for (let i = 0; i < REGIONS.length; i++) {
        const list = grids[REGIONS[i].key] || [];
        if (!list.length) continue;
        const g = list[0];
        const c = toBox((g.lx + g.rx + 1) / 2, (g.ty + g.by + 1) / 2);
        /* The GRID's extent, not the region mask's: a probe aiming at "the top
           of the face canvas" wants the rows the cells actually cover. */
        const a0 = toBox(g.ox, g.oy), a1 = toBox(g.ox + ART_W * g.cw, g.oy + ART_H * g.ch);
        aim[REGIONS[i].key] = {
          x: c.x, y: c.y, target: REGIONS[i].target,
          gx0: Math.min(a0.x, a1.x), gy0: Math.min(a0.y, a1.y),
          gw: Math.abs(a1.x - a0.x), gh: Math.abs(a1.y - a0.y),
        };
      }
      box.__btInkAim = aim;
      /* v2.3.1994: the view itself, so the zoom-persistence scenario can read
         the number it is defending instead of inferring it from a box size. */
      box.__btInkView = { z: viewRef.current.z, cx: viewRef.current.cx, cy: viewRef.current.cy };
    } catch (e) { /* frozen element: no probe, no harm */ }

    /* The grid of every region this tab can reach — all of them now, because
       all of them are inkable and a region with no grid drawn over it is the
       one the owner could not tell was there. */
    ctx.save();
    ctx.lineWidth = Math.max(1, dpr * 0.5);
    for (let i = 0; i < tabKeys.length; i++) {
      const list = grids[tabKeys[i]] || [];
      const R = REGIONS.find((q) => q.key === tabKeys[i]);
      const on = R && R.target === activeTarget;
      /* The canvas you are editing is drawn brighter than the ones beside it,
         so "which drawing does this stroke go on" is answerable by looking. */
      ctx.strokeStyle = on ? 'rgba(229,237,233,.24)' : 'rgba(229,237,233,.10)';
      for (let k = 0; k < list.length; k++) {
        const g = list[k];
        ctx.beginPath();
        for (let j = 0; j <= ART_W; j++) {
          const a = toBox(g.ox + j * g.cw, g.oy), b = toBox(g.ox + j * g.cw, g.oy + ART_H * g.ch);
          ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
        }
        for (let j = 0; j <= ART_H; j++) {
          const a = toBox(g.ox, g.oy + j * g.ch), b = toBox(g.ox + ART_W * g.cw, g.oy + j * g.ch);
          ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
        }
        ctx.stroke();
      }
    }
    ctx.restore();

    const actKey = keyForTarget(activeTarget);
    const actList = (actKey && grids[actKey]) || [];
    const eachCell = (cells, fn) => {
      for (let k = 0; k < actList.length; k++) {
        const g = actList[k];
        for (let i = 0; i < cells.length; i++) {
          const a = toBox(g.ox + cells[i][0] * g.cw, g.oy + cells[i][1] * g.ch);
          const b = toBox(g.ox + (cells[i][0] + 1) * g.cw, g.oy + (cells[i][1] + 1) * g.ch);
          fn(a, b, g, cells[i]);
        }
      }
    };

    /* v2.3.1994: the op in flight, painted ahead of the composite so the finger
       never waits for a body sheet to bake.  It is already IN the drawing — the
       panel appended it before this render — so this is the same ink twice, on
       purpose: whichever of the two lands first is what you see. */
    if (overlayCells && overlayCells.length) {
      ctx.save();
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = ink > 0 ? ART_PALETTE[ink] : 'rgba(20,26,32,.55)';
      eachCell(overlayCells, (a, b) => ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y));
      ctx.restore();
    }

    /* v2.3.1994: the selection outline, ported from the flat grid so picking a
       shape up with the hand looks the same on the body as it does on the
       shirt.  Only the edges with no neighbour in the set are stroked, so the
       ring hugs the shape rather than boxing three others in with it. */
    if (selCells && selCells.length) {
      const has = new Uint8Array(ART_W * ART_H);
      for (let i = 0; i < selCells.length; i++) has[selCells[i][1] * ART_W + selCells[i][0]] = 1;
      ctx.save();
      ctx.lineWidth = Math.max(1.5, dpr * 1.1);
      ctx.strokeStyle = '#D8AA58';
      ctx.beginPath();
      eachCell(selCells, (a, b, g, c) => {
        const x = c[0], y = c[1];
        if (y === 0 || !has[(y - 1) * ART_W + x]) { ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, a.y); }
        if (y === ART_H - 1 || !has[(y + 1) * ART_W + x]) { ctx.moveTo(a.x, b.y); ctx.lineTo(b.x, b.y); }
        if (x === 0 || !has[y * ART_W + x - 1]) { ctx.moveTo(a.x, a.y); ctx.lineTo(a.x, b.y); }
        if (x === ART_W - 1 || !has[y * ART_W + x + 1]) { ctx.moveTo(b.x, a.y); ctx.lineTo(b.x, b.y); }
      });
      ctx.stroke();
      ctx.restore();
    }

    /* v2.3.1994: and the resize handle, on the first piece only — an arm pair
       wears the same drawing twice and two handles would be two things to
       drag for one shape. */
    if (handleCell && actList.length) {
      const g = actList[0];
      const a = toBox(g.ox + handleCell[0] * g.cw, g.oy + handleCell[1] * g.ch);
      const b = toBox(g.ox + (handleCell[0] + 1) * g.cw, g.oy + (handleCell[1] + 1) * g.ch);
      const hx = (a.x + b.x) / 2, hy = (a.y + b.y) / 2;
      const r = Math.max(9, Math.abs(b.x - a.x) * 0.62);
      ctx.beginPath();
      ctx.arc(hx, hy, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(10,14,18,.55)';
      ctx.fill();
      ctx.lineWidth = Math.max(2, dpr);
      ctx.strokeStyle = '#D8AA58';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(hx, hy, Math.max(2, r * 0.28), 0, Math.PI * 2);
      ctx.fillStyle = '#D8AA58';
      ctx.fill();
    }
  }, [windowFor, tabKeys, activeTarget, ink, overlayCells, selCells, handleCell]);

  /* ═══ v2.3.1978: THE REGION FILLS THE EDITOR ═══
     Owner: "In the editor show the actual full upper torso region where you
     can just draw the tattoo directly on.  It will be full zoom but fitting
     within the editor window."  So the view is not something to set up by
     pinching before you can start — it is computed from the region's own
     extent the moment the composite reports it, and again whenever the tab
     changes. The manual zoom and pan stay for nudging, but nobody has to use
     them to draw.

     v2.3.1994: the union of every region the TAB reaches, not just one of
     them — the Body tab has to frame both arms as well as the torso now, or
     the skin it just made inkable would be off screen.

     ═══ v2.3.1994: AND IT FRAMES ONCE, NOT ON EVERY STROKE ═══
     Owner: "When you try to zoom way in to draw detail it auto zooms you back
     out. That needs fixed."

     THE DEFECT, NAMED.  This function was called from the COMPOSITE's
     completion handler, and the composite re-runs on every change to `arts` —
     which is to say after every single mark you make. So the sequence was:
     pinch in to 12x, touch the skin, the drawing changes, the figure
     re-composites, and the last thing that composite did was re-frame the view
     to the fitted zoom. It did not "drift" back out; it was PUT back, by the
     act of drawing, every time.

     `fittedRef` is the whole fix: an automatic fit happens once per region,
     which is the case it exists for (the first composite, when the grids do
     not exist yet at mount, and a tab change). The 100% button passes `force`
     and is now the only thing that can move a view you set yourself. */
  const fittedRef = React.useRef('');
  const fitRegion = React.useCallback((force) => {
    const off = offRef.current, grids = gridsRef.current, m = xformRef.current;
    if (!off || !off.width || !grids || !m) return;
    if (!force && fittedRef.current === region) return;
    let lx = Infinity, rx = -Infinity, ty = Infinity, by = -Infinity;
    for (let i = 0; i < tabKeys.length; i++) {
      const list = grids[tabKeys[i]] || [];
      for (let k = 0; k < list.length; k++) {
        const g = list[k];
        /* The GRID's extent, not the mask's: the grid is what accepts ink, and
           v2.3.1994 makes them the same rectangle anyway except for the 16px
           minimum a narrow arm is widened to — which the player still has to
           be able to see all of. */
        if (g.ox < lx) lx = g.ox;
        if (g.ox + ART_W * g.cw > rx) rx = g.ox + ART_W * g.cw;
        if (g.oy < ty) ty = g.oy;
        if (g.oy + ART_H * g.ch > by) by = g.oy + ART_H * g.ch;
      }
    }
    if (!(rx > lx && by > ty)) return;
    const P = (x, y) => ({ x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f });
    const p0 = P(lx, ty), p1 = P(rx, by);
    const bw = Math.abs(p1.x - p0.x), bh = Math.abs(p1.y - p0.y);
    if (!bw || !bh) return;
    const z = Math.max(MIN_Z, Math.min(MAX_Z,
      Math.min(off.width * FIT / bw, off.height * FIT / bh)));
    const cx = ((p0.x + p1.x) / 2) / off.width;
    const cy = ((p0.y + p1.y) / 2) / off.height;
    fittedRef.current = region;
    setView((v) => (Math.abs(v.z - z) < 0.01 && Math.abs(v.cx - cx) < 0.002
      && Math.abs(v.cy - cy) < 0.002) ? v : { z, cx, cy });
  }, [region, tabKeys]);

  /* Re-frame when the tab changes. The composite path calls it too, for the
     first one, where the grids do not exist yet at mount. */
  React.useEffect(() => { fitRegion(); }, [region, fitRegion]);

  /* ── the composite ────────────────────────────────────────────────────── */
  React.useEffect(() => {
    if (!look) return undefined;
    let alive = true;
    let raf = 0;
    const draw = () => {
      if (!offRef.current) offRef.current = document.createElement('canvas');
      const A = artsRef.current || {};
      const opts = Object.assign({}, look, {
        dir,
        /* Every skin canvas at once, and nothing worn that would hide one:
           this surface exists so you can move between chest, face and arms
           without changing screens, and a covered region you cannot ink reads
           as broken rather than as covered. The panel's caption says what a
           shirt and a hat hide in play. */
        shirt: 'none', headwear: 'none',
        tattooArt: A.tattoo || '', faceTattooArt: A.tattooFace || '', armTattooArt: A.tattooArm || '',
        reportGrids: true,
        scale: Math.min(2, Math.round((typeof window !== 'undefined' && window.devicePixelRatio) || 1)),
      });
      return drawCharacterPortrait(offRef.current, opts).then(() => {
        const off = offRef.current;
        gridsRef.current = (off && off.__btGrids) || null;
        xformRef.current = (off && off.__btGridXform) || null;
        /* v2.3.1994: AUTOMATIC, so it only lands the first time this region is
           framed. See fitRegion — this call is why the zoom used to snap back. */
        fitRegion();
      });
    };
    const run = () => {
      raf = 0;
      if (!alive || busyRef.current) { dirtyRef.current = true; return; }
      busyRef.current = true;
      Promise.resolve().then(draw).then(() => { if (alive) blit(); })
        .catch(() => { /* a missing sprite must not take the panel down */ })
        .then(() => {
          busyRef.current = false;
          if (alive && dirtyRef.current) { dirtyRef.current = false; kick(); }
        });
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(run); };
    kickRef.current = kick;
    kick();
    const onResize = () => { try { blit(); } catch (e) { /* ignore */ } };
    window.addEventListener('resize', onResize);
    return () => {
      alive = false; kickRef.current = null;
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, [look, dir, arts, blit, fitRegion]);

  /* View changes need no new composite, only a re-blit — and so do the three
     overlays, which is what makes the ink appear under the finger a frame
     before the sheet it is baked into does. */
  React.useEffect(() => { try { blit(); } catch (e) { /* ignore */ } }, [view, blit]);

  /* ── pointer handling ─────────────────────────────────────────────────── */
  const zoomBy = React.useCallback((k, ax, ay) => {
    setView((v) => {
      const z = Math.max(MIN_Z, Math.min(MAX_Z, v.z * k));
      if (z === v.z) return v;
      /* Keep the anchor point still: the fraction of the window it sits at
         does not move, so the centre shifts by the change in half-window. */
      if (ax == null) return { ...v, z };
      const dx = (ax - 0.5) * (1 / v.z - 1 / z);
      const dy = (ay - 0.5) * (1 / v.z - 1 / z);
      return { z, cx: v.cx + dx, cy: v.cy + dy };
    });
  }, []);

  /* v2.3.1994: a gesture that has begun is finished exactly once, whatever
     ends it — a lifted finger, a cancelled pointer, or a second finger
     arriving to pinch.  Losing your marks because you steadied the phone with
     a thumb is the worse failure, so the panel is told to close the op rather
     than the op being dropped. */
  const endGesture = (e) => {
    if (!gestureRef.current) return;
    gestureRef.current = null;
    if (onUp) onUp(e);
    if (kickRef.current) kickRef.current();
  };

  /* Is this pointer on the selected op's resize handle?  Generous, for the
     same reason the flat grid's test is: the handle is drawn about two-thirds
     of a cell and a finger is a lot wider than that. */
  const hitHandle = (e) => {
    const api = apiRef && apiRef.current;
    if (!api || !handleCell) return false;
    const c = api.cellCenter(activeTarget, handleCell[0], handleCell[1]);
    if (!c) return false;
    return Math.hypot(e.clientX - c.x, e.clientY - c.y) <= Math.max(22, c.w * 1.3);
  };

  const down = (e) => {
    const box = boxRef.current;
    if (box && box.setPointerCapture) { try { box.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } }
    ptrsRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrsRef.current.size === 2) {
      endGesture(e);
      const [a, b] = [...ptrsRef.current.values()];
      pinchRef.current = { d: Math.hypot(a.x - b.x, a.y - b.y), z: viewRef.current.z };
      return;
    }
    if (panRef.current) return;                 /* pan mode: down starts a drag */
    /* ── v2.3.1994: THE HANDLE IS ASKED FIRST, AND IT DOES NOT RE-TARGET ──
       A shape's resize handle is dragged to a corner, and that corner can
       easily be over an ARM while the shape itself lives on the chest.  If the
       region test ran first, grabbing the handle would move the whole editing
       context onto the arm — and the shape you were resizing would be on a
       canvas nobody was looking at any more.  So the handle wins, the gesture
       is locked to the canvas the selection is already on, and the panel is
       told the answer rather than testing the same circle a second time with
       its own arithmetic. */
    const onH = !!(handleCell && hitHandle(e));
    if (onH) gestureRef.current = activeTarget;
    else {
      const c = cellFor(e, false, null);
      if (!c) {
        try {
          const g = gridsRef.current;
          const pt = sheetAt(e.clientX, e.clientY);
          window.__btInkDown = {
            miss: true, back: !!backSide,
            gridKeys: g ? Object.keys(g) : null,
            counts: g ? Object.keys(g).map((k) => k + ':' + (g[k] || []).length) : null,
            tabKeys: tabKeys.slice(),
            pt: pt ? { x: Math.round(pt.x), y: Math.round(pt.y) } : null,
          };
        } catch (_e) { /* ignore */ }
        return;
      }
      /* The canvas this gesture belongs to is decided ONCE, here, and every
         later sample is measured against it — see cellFor's `lock`. */
      gestureRef.current = c.target;
      /* v2.3.2150: read-only probe of what this surface decided a touch was.
         The game never reads it. It exists because "the stroke went nowhere"
         has three indistinguishable causes from outside -- the touch missed
         the grid, the region resolved to the wrong canvas, or the panel
         dropped it downstream -- and only the surface can say which. */
      try { window.__btInkDown = { target: c.target, gx: c.gx, gy: c.gy, back: !!backSide }; } catch (e) { /* ignore */ }
      if (onRegion) onRegion(c.target);
    }
    if (onDown) onDown(e, { handle: onH });
  };

  const move = (e) => {
    const p = ptrsRef.current.get(e.pointerId);
    if (p) { const prev = { x: p.x, y: p.y }; p.x = e.clientX; p.y = e.clientY; p.prev = prev; }
    if (ptrsRef.current.size === 2 && pinchRef.current) {
      const [a, b] = [...ptrsRef.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchRef.current.d > 4) {
        const target = Math.max(MIN_Z, Math.min(MAX_Z, pinchRef.current.z * (d / pinchRef.current.d)));
        setView((v) => (v.z === target ? v : { ...v, z: target }));
      }
      return;
    }
    if (panRef.current && p && p.prev) {
      const box = boxRef.current;
      const r = box && box.getBoundingClientRect();
      if (r && r.width) {
        setView((v) => ({
          ...v,
          cx: v.cx - ((e.clientX - p.prev.x) / r.width) / v.z,
          cy: v.cy - ((e.clientY - p.prev.y) / r.height) / v.z,
        }));
      }
      return;
    }
    if (!gestureRef.current) return;
    if (onMove) onMove(e);
  };

  const up = (e) => {
    ptrsRef.current.delete(e.pointerId);
    if (ptrsRef.current.size < 2) pinchRef.current = null;
    endGesture(e);
  };

  return (
    <div className="bt-bodyink">
      <canvas ref={boxRef} className="bt-bodyink-cv"
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        aria-label="Your character — draw straight onto the skin"
        style={{ width: '100%', aspectRatio: '1 / 1', imageRendering: 'pixelated',
          touchAction: 'none', cursor: pan ? 'grab' : 'crosshair', borderRadius: 8,
          border: '1px solid rgba(229,237,233,.28)', display: 'block' }} />
      <div className="bt-bodyink-bar">
        {/* ── v2.3.1994: the pan toggle is a PICTURE ──
            Owner: "Change move button to just something that represents panning
            the screen."  It said "Move" / "Ink", which is two words for one
            button and neither of them is the thing you are about to do with
            your finger.  Four arrows out of a centre point is the glyph every
            map and every image editor uses for exactly this, drawn inline in
            the same one-viewBox stroke style as the tool icons (an asset that
            is never fetched cannot hitch on first use, which is what the
            animation-preload law exists to prevent). */}
        <button type="button" className={'bt-paint-size' + (pan ? ' bt-paint-size--on' : '')}
          aria-pressed={pan} aria-label="Drag to move the view"
          onClick={() => setPan((p) => !p)}
          title={pan ? 'Dragging moves the view — tap to go back to drawing' : 'Drag to move the view instead of drawing'}>
          <svg className="bt-paint-tool-icon" viewBox="0 0 24 24" width="20" height="20"
            aria-hidden="true" focusable="false">
            <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 4.2v15.6M4.2 12h15.6" />
              <path d="M12 3.2 9.9 5.6M12 3.2l2.1 2.4" />
              <path d="M12 20.8 9.9 18.4M12 20.8l2.1-2.4" />
              <path d="M3.2 12l2.4-2.1M3.2 12l2.4 2.1" />
              <path d="M20.8 12l-2.4-2.1M20.8 12l-2.4 2.1" />
            </g>
          </svg>
        </button>
        <button type="button" className="bt-paint-size" onClick={() => zoomBy(1 / 1.35)} title="Zoom out"
          disabled={view.z <= MIN_Z + 0.001}>
          <span className="bt-paint-tool-label">&minus;</span>
        </button>
        <button type="button" className="bt-paint-size" onClick={() => zoomBy(1.35)} title="Zoom in"
          disabled={view.z >= MAX_Z - 0.001}>
          <span className="bt-paint-tool-label">+</span>
        </button>
        {/* v2.3.1978: the region readout is gone — the tab above says Body or
            Face, and the editor is framed on that one region, so naming it
            again in the corner was telling you something you chose.
            v2.3.1994 (owner: "Change 'fit' to just '100%'"): "Fit" named the
            mechanism; "100%" names the view you get back, which is the one the
            editor opens on. */}
        <button type="button" className="bt-paint-size" onClick={() => fitRegion(true)}
          title="Back to the whole area, at the zoom this opened on">
          <span className="bt-paint-tool-label">100%</span>
        </button>
      </div>
    </div>
  );
}
