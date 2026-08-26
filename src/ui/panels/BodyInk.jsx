import React from 'react';
import { ART_W, ART_H, ART_PALETTE } from '@/rendering/traits/playerArt.js';
import { expandCells } from '@/rendering/traits/artTools.js';
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
 * for the FEEDBACK, so a stroke paints a cheap overlay immediately and the
 * composite catches up behind it. The finger never waits for a sheet to bake.
 *
 * ── ZOOM WITHOUT A SECOND FINGER ──
 * Pinch works, but every gesture here is also reachable one-handed: a Move
 * toggle turns the drag into a pan, and the +/- buttons zoom. The primary
 * platform is a phone held in one hand, and a two-finger-only zoom is a
 * feature that does not exist for the person carrying a coffee.
 */

const MIN_Z = 1, MAX_Z = 16;
/* How much of the editor the framed region fills. Short of 1 so the region's
   own edges are reachable with a finger rather than pinned to the bezel. */
const FIT = 0.86;

/* Region priority, most specific first — see "WHICH REGION YOU ARE ON". */
const REGIONS = [
  { key: 'face',   target: 'tattooFace', label: 'Face' },
  { key: 'arms',   target: 'tattooArm',  label: 'Arms' },
  { key: 'tattoo', target: 'tattoo',     label: 'Chest' },
];

/** Invert a 2D affine matrix applied as x' = a·x + c·y + e. */
function unproject(m, x, y) {
  const det = m.a * m.d - m.b * m.c;
  if (!det) return null;
  const dx = x - m.e, dy = y - m.f;
  return { x: (dx * m.d - dy * m.c) / det, y: (dy * m.a - dx * m.b) / det };
}

export default function BodyInk({
  look, arts, ink = 1, brush = 1, dir = 'south', region = 'tattoo',
  onInk, onRegion,
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

  /* Live stroke state. Refs, not state: a pointermove handler must read the
     CURRENT values, and a state value captured in its closure is a render
     behind (the same reason the flat editor keeps its draft in a ref). */
  const paintingRef = React.useRef(false);
  const strokeRef = React.useRef(null);   /* {target, cells:[[x,y]…], seen:Set} */
  const lastCellRef = React.useRef(null);
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

  /* ── box pixel -> body-sheet pixel -> {region, cell} ──────────────────── */
  const hitAt = React.useCallback((clientX, clientY) => {
    const box = boxRef.current, off = offRef.current;
    const grids = gridsRef.current, m = xformRef.current;
    if (!box || !off || !off.width || !grids || !m) return null;
    const r = box.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    const w = windowFor(off, viewRef.current);
    /* fraction across the visible box -> offscreen px */
    const ox = w.sx + ((clientX - r.left) / r.width) * w.sw;
    const oy = w.sy + ((clientY - r.top) / r.height) * w.sh;
    const p = unproject(m, ox, oy);
    if (!p) return null;
    /* v2.3.1978: ONE region, chosen by the tab, not by where the finger lands.
       The editor is framed on that region and nothing else is reachable, so a
       stroke cannot wander onto a canvas you did not mean to edit. */
    const R = REGIONS.find((q) => q.key === region) || REGIONS[0];
    const list = grids[R.key] || [];
    for (let k = 0; k < list.length; k++) {
      const g = list[k];
      const c = cellAt(g, p.x, p.y);
      if (c) return { region: R.key, target: R.target, gx: c.gx, gy: c.gy };
    }
    return null;
  }, [windowFor, region]);

  /* ── blit: offscreen -> visible, plus the grid and the live stroke ─────── */
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
    } catch (e) { /* frozen element: no probe, no harm */ }

    /* The grid of the region under the pointer only. All three at once is a
       thicket, and the one you are working on is the one worth seeing. */
    const R = REGIONS.find((q) => q.key === region);
    const list = (R && grids[R.key]) || [];
    if (list.length) {
      ctx.save();
      ctx.lineWidth = Math.max(1, dpr * 0.5);
      ctx.strokeStyle = 'rgba(229,237,233,.20)';
      for (let k = 0; k < list.length; k++) {
        const g = list[k];
        ctx.beginPath();
        for (let i = 0; i <= ART_W; i++) {
          const a = toBox(g.ox + i * g.cw, g.oy), b = toBox(g.ox + i * g.cw, g.oy + ART_H * g.ch);
          ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
        }
        for (let j = 0; j <= ART_H; j++) {
          const a = toBox(g.ox, g.oy + j * g.ch), b = toBox(g.ox + ART_W * g.cw, g.oy + j * g.ch);
          ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    /* The stroke, painted ahead of the composite so the finger never waits. */
    const st = strokeRef.current;
    if (st && st.cells.length) {
      const R2 = REGIONS.find((q) => q.target === st.target);
      const list2 = (R2 && grids[R2.key]) || [];
      ctx.save();
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = ink > 0 ? ART_PALETTE[ink] : 'rgba(20,26,32,.55)';
      for (let k = 0; k < list2.length; k++) {
        const g = list2[k];
        for (let i = 0; i < st.cells.length; i++) {
          const a = toBox(g.ox + st.cells[i][0] * g.cw, g.oy + st.cells[i][1] * g.ch);
          const b = toBox(g.ox + (st.cells[i][0] + 1) * g.cw, g.oy + (st.cells[i][1] + 1) * g.ch);
          ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
        }
      }
      ctx.restore();
    }
  }, [windowFor, region, ink]);

  /* ═══ v2.3.1978: THE REGION FILLS THE EDITOR ═══
     Owner: "In the editor show the actual full upper torso region where you
     can just draw the tattoo directly on.  It will be full zoom but fitting
     within the editor window."  So the view is not something to set up by
     pinching before you can start — it is computed from the region's own
     extent the moment the composite reports it, and again whenever the tab
     changes. The manual zoom and pan stay for nudging, but nobody has to use
     them to draw. */
  const fitRegion = React.useCallback(() => {
    const off = offRef.current, grids = gridsRef.current, m = xformRef.current;
    if (!off || !off.width || !grids || !m) return;
    const R = REGIONS.find((q) => q.key === region) || REGIONS[0];
    const list = grids[R.key] || [];
    if (!list.length) return;
    /* Union of the region's pieces — the arms report two grids, and framing
       one of them would put the other off screen. */
    let lx = Infinity, rx = -Infinity, ty = Infinity, by = -Infinity;
    for (let k = 0; k < list.length; k++) {
      const g = list[k];
      if (g.lx < lx) lx = g.lx; if (g.rx + 1 > rx) rx = g.rx + 1;
      if (g.ty < ty) ty = g.ty; if (g.by + 1 > by) by = g.by + 1;
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
    setView((v) => (Math.abs(v.z - z) < 0.01 && Math.abs(v.cx - cx) < 0.002
      && Math.abs(v.cy - cy) < 0.002) ? v : { z, cx, cy });
  }, [region]);

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

  /* View changes need no new composite, only a re-blit. */
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

  /* v2.3.1967: hand over the CELLS, not a finished art string.
     A whole replacement string was the right shape while a canvas WAS a string;
     it is exactly wrong now that a canvas is an ordered op list (artOps.js),
     because a string says "the drawing is now this" and there is no way to
     honour that without either throwing the list away — destroying every shape
     placed on the flat tab — or replaying over the top of it and losing the
     stroke.  Cells say "these cells, in this colour, now", which is an op like
     any other: it lands ON TOP, in the order it was made, and everything
     underneath it survives.  The panel owns what that means for undo. */
  const applyStroke = React.useCallback(() => {
    const st = strokeRef.current;
    if (!st || !st.cells.length) return;
    const cells = expandCells(st.cells, brush);
    if (cells.length && onInk) onInk(st.target, cells, ink);
  }, [brush, ink, onInk]);

  const addCell = React.useCallback((h) => {
    const st = strokeRef.current;
    if (!st || h.target !== st.target) return;
    const k = h.gy * ART_W + h.gx;
    if (st.seen.has(k)) return;
    st.seen.add(k);
    st.cells.push([h.gx, h.gy]);
    /* Draw the feedback now; the composite catches up on its own frame. */
    try { blit(); } catch (e) { /* ignore */ }
  }, [blit]);

  const down = (e) => {
    const box = boxRef.current;
    if (box && box.setPointerCapture) { try { box.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } }
    ptrsRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrsRef.current.size === 2) {
      /* Second finger: whatever was happening becomes a pinch. A stroke in
         flight is COMMITTED rather than dropped — losing your marks because
         you steadied the phone with a thumb is the worse failure. */
      if (paintingRef.current) { applyStroke(); paintingRef.current = false; strokeRef.current = null; }
      const [a, b] = [...ptrsRef.current.values()];
      pinchRef.current = { d: Math.hypot(a.x - b.x, a.y - b.y), z: viewRef.current.z };
      return;
    }
    if (pan) { return; }                        /* Move mode: down starts a drag */
    const h = hitAt(e.clientX, e.clientY);
    if (!h) return;
    paintingRef.current = true;
    strokeRef.current = { target: h.target, cells: [], seen: new Set() };
    lastCellRef.current = h;
    if (onRegion) onRegion(h.target);
    addCell(h);
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
    if (pan && p && p.prev) {
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
    if (!paintingRef.current) {
      /* Not painting: still track which region the pointer is over, so the
         grid overlay follows a hovering mouse. */
      return;
    }
    const h = hitAt(e.clientX, e.clientY);
    if (!h) return;
    const last = lastCellRef.current;
    /* A fast drag skips cells; walk the gap so a stroke is continuous. */
    if (last && (Math.abs(h.gx - last.gx) > 1 || Math.abs(h.gy - last.gy) > 1) && last.target === h.target) {
      const steps = Math.max(Math.abs(h.gx - last.gx), Math.abs(h.gy - last.gy));
      for (let i = 1; i < steps; i++) {
        addCell({
          target: h.target, region: h.region,
          gx: Math.round(last.gx + (h.gx - last.gx) * (i / steps)),
          gy: Math.round(last.gy + (h.gy - last.gy) * (i / steps)),
        });
      }
    }
    lastCellRef.current = h;
    addCell(h);
  };

  const up = (e) => {
    ptrsRef.current.delete(e.pointerId);
    if (ptrsRef.current.size < 2) pinchRef.current = null;
    if (!paintingRef.current) return;
    paintingRef.current = false;
    applyStroke();
    strokeRef.current = null;
    lastCellRef.current = null;
    if (kickRef.current) kickRef.current();
  };


  return (
    <div className="bt-bodyink">
      <canvas ref={boxRef} className="bt-bodyink-cv"
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        aria-label="Your character — drag to tattoo the part you are over"
        style={{ width: '100%', aspectRatio: '1 / 1', imageRendering: 'pixelated',
          touchAction: 'none', cursor: pan ? 'grab' : 'crosshair', borderRadius: 8,
          border: '1px solid rgba(229,237,233,.28)', display: 'block' }} />
      <div className="bt-bodyink-bar">
        <button type="button" className={'bt-paint-size' + (pan ? ' bt-paint-size--on' : '')}
          onClick={() => setPan((p) => !p)} title="Drag to move the character instead of inking it">
          <span className="bt-paint-tool-label">{pan ? 'Move' : 'Ink'}</span>
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
            again in the corner was telling you something you chose. */}
        <button type="button" className="bt-paint-size" onClick={fitRegion}
          title="Frame the whole area again">
          <span className="bt-paint-tool-label">Fit</span>
        </button>
      </div>
    </div>
  );
}
