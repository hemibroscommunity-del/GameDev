/* ═══ v2.3.2966: THE WORLD MAP — the whole Wheel, labelled ═══
 *
 * Owner, 2026-10-01: "Maybe tapping it brings up an overlay of a labelled
 * world map.  It would probably help to have areas labelled so players can
 * start memorizing the territory."
 *
 * Only in the Wheel (`?trial=wheel`), where the minimap is the Wheel's own
 * (src/rendering/systems/wheelMinimap.js).  Two parts:
 *
 *   - a see-through button laid exactly over that minimap (its place is
 *     published as window.__btWheelMini), so tapping the box opens the map --
 *     a DOM button, as the minimap is drawn in the game's WebGL canvas, which
 *     takes no taps;
 *   - the map: the whole Wheel from the worker's overview (its own ground
 *     colours), the roads, the river and the railway as clean lines, and
 *     labels that grow with the zoom -- the eight lands and their levels
 *     first, then each land's four stages, the gates and where they lead,
 *     then the camps and the passes with their levels, the landmarks, and
 *     the roads' names -- every label kept clear of the ones before it, so
 *     it never turns to mush.  You are an arrow the way you face, in a
 *     pulsing ring.  Drag to look round, pinch or + / - to zoom, the target
 *     button to come back to you.
 *
 * Everything it draws comes from public/tools/world/core/wheelmap.js (built
 * by the worker from the plan) and the overview the ground already uses, so
 * it never disagrees with the ground under your feet.  Nothing is loaded.
 *
 * QA: window.__btWorldMap (tools/qa/mp/mp-wheelmap.mjs).
 */
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { isWheelTrialZone } from '../game/worldTrial.js';
import { wheelMapInfo, wheelOverviewLands, wheelHere } from '../game/wheelTrial.js';

const FACING = ['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast'];
const ZOOM_MAX = 12;
/* what is labelled from which zoom (1 = the whole Wheel on screen) */
const AT = { landSub: 1.5, stage: 2.2, commons: 1.8, gateName: 1.6, camp: 3, pass: 3, site: 3.6, road: 4.6 };
const INK = '#F4F0E7', BRASS = '#EAC675', HALO = 'rgba(11,22,27,0.92)';
const KIND = {
  camp: { color: '#EAC675', label: 'camp' },
  pass: { color: '#F4F0E7', label: 'pass' },
  gate: { color: '#C58CFF', label: 'gate' },
  landmark: { color: '#9FE0C0', label: 'landmark' },
  site: { color: '#9FE0C0', label: 'place' },
};

export function WorldMapOverlay({ stateRef }) {
  const [inWheel, setInWheel] = useState(false);
  const [rect, setRect] = useState(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const id = setInterval(() => {
      const S = stateRef && stateRef.current;
      const on = !!(S && isWheelTrialZone(S.currentZone) && wheelMapInfo());
      setInWheel(on);
      const r = on ? window.__btWheelMini || null : null;
      setRect((old) => (old && r && old.left === r.left && old.top === r.top && old.w === r.w && old.h === r.h ? old : r));
      if (!on) setOpen(false);
    }, 300);
    return () => clearInterval(id);
  }, [stateRef]);
  useEffect(() => {
    /* QA: open and close it without a tap */
    window.__btWorldMapOpen = (v) => setOpen(v !== false);
    return () => { try { delete window.__btWorldMapOpen; } catch (e) { /* gone */ } };
  }, []);
  if (!inWheel) return null;
  /* into the page's body, not the game's tree: the bottom dashboard (z 30)
     sits above everything inside the game's wrapper, whatever its z-index,
     and would cover the map's buttons (caught by mp-wheelmap) */
  return createPortal(
    <>
      {rect && !open && (
        <button
          type="button"
          aria-label="Open the world map"
          data-world-map-open=""
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={() => setOpen(true)}
          style={{ position: 'fixed', left: rect.left, top: rect.top, width: rect.w, height: rect.h, zIndex: 45,
            background: 'transparent', border: 0, padding: 0, margin: 0, cursor: 'pointer', touchAction: 'manipulation' }}
        />
      )}
      {open && <WorldMap stateRef={stateRef} onClose={() => setOpen(false)} />}
    </>,
    document.body,
  );
}

function WorldMap({ stateRef, onClose }) {
  const cvRef = useRef(null);
  const view = useRef({ zoom: 1, cx: null, cy: null });
  const ptrs = useRef(new Map());
  const pinch = useRef(null);
  const dirty = useRef(true);
  const [where, setWhere] = useState(null);
  const [zoomShown, setZoomShown] = useState(1);

  useEffect(() => {
    const cv = cvRef.current;
    const map = wheelMapInfo();
    if (!cv || !map) return undefined;
    const V = view.current;
    if (V.cx == null) { V.cx = map.worldW / 2; V.cy = map.worldH / 2; }
    let raf = 0, last = 0, lastP = '';
    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const w = cv.clientWidth, h = cv.clientHeight;
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
        cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
        dirty.current = true;
      }
      return { w, h, dpr };
    };
    const loop = (t) => {
      raf = requestAnimationFrame(loop);
      const S = stateRef.current;
      const P = S && S.player;
      const pk = P ? `${Math.round(P.x)},${Math.round(P.y)},${S._renderFacing}` : '';
      /* the ring pulses: a few frames a second is plenty */
      if (!dirty.current && pk === lastP && t - last < 120) return;
      lastP = pk; last = t; dirty.current = false;
      const { w, h, dpr } = size();
      const out = draw(cv.getContext('2d'), w, h, dpr, map, V, P, S && S._renderFacing, t);
      const here = P ? wheelHere(P.x, P.y) : null;
      const words = here && here.words ? `${here.words.title}${here.words.sub ? ` · ${here.words.sub}` : ''}` : '';
      setWhere((o) => (o === words ? o : words));
      try { window.__btWorldMap = { open: true, zoom: V.zoom, cx: Math.round(V.cx), cy: Math.round(V.cy), ...out }; } catch (e) { /* no page */ }
    };
    raf = requestAnimationFrame(loop);
    const onResize = () => { dirty.current = true; };
    window.addEventListener('resize', onResize);
    /* the trial's own readout (worldTrial.js) sits above everything: it
       steps aside while the map is open */
    const readout = document.getElementById('bt-world-trial');
    const was = readout ? readout.style.visibility : '';
    if (readout) readout.style.visibility = 'hidden';
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      if (readout) readout.style.visibility = was;
      try { window.__btWorldMap = { open: false }; } catch (e) { /* no page */ }
      /* v2.3.3070: the map's canvas is the whole screen at the device's
         pixels (390 x 844 at 3x: 11.3 MB) and goes with the map -- but its
         pixels went only when the garbage collector came round to it, so
         opening and closing the map a few times held a few dead copies.
         Emptied now, as it closes (docs/MEMORY-PLAN.md, freed on close;
         mp-worldmapfree). */
      try { cv.width = 0; cv.height = 0; } catch (e) { /* gone */ }
    };
  }, [stateRef]);

  /* zoom by `f` about a point on screen (CSS px) */
  const zoomAt = (f, sx, sy) => {
    const cv = cvRef.current, map = wheelMapInfo();
    if (!cv || !map) return;
    const V = view.current, k0 = baseScale(cv.clientWidth, cv.clientHeight, map) * V.zoom;
    const z = Math.max(1, Math.min(ZOOM_MAX, V.zoom * f));
    const k1 = baseScale(cv.clientWidth, cv.clientHeight, map) * z;
    /* the world point under (sx, sy) stays under it */
    const wx = V.cx + (sx - cv.clientWidth / 2) / k0, wy = V.cy + (sy - cv.clientHeight / 2) / k0;
    V.zoom = z;
    V.cx = wx - (sx - cv.clientWidth / 2) / k1;
    V.cy = wy - (sy - cv.clientHeight / 2) / k1;
    clampView(V, map);
    setZoomShown(z);
    dirty.current = true;
  };
  const onDown = (e) => {
    e.stopPropagation();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* fine */ }
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()];
      pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1 };
    }
  };
  const onMove = (e) => {
    const p = ptrs.current.get(e.pointerId);
    if (!p) return;
    const map = wheelMapInfo(), cv = cvRef.current;
    if (!map || !cv) return;
    const V = view.current, k = baseScale(cv.clientWidth, cv.clientHeight, map) * V.zoom;
    if (ptrs.current.size === 1) {
      V.cx -= (e.clientX - p.x) / k; V.cy -= (e.clientY - p.y) / k;
      clampView(V, map);
      dirty.current = true;
    }
    p.x = e.clientX; p.y = e.clientY;
    if (ptrs.current.size === 2 && pinch.current) {
      const [a, b] = [...ptrs.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const r = cv.getBoundingClientRect();
      zoomAt(d / pinch.current.d, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
      pinch.current.d = d;
    }
  };
  const onUp = (e) => { ptrs.current.delete(e.pointerId); if (ptrs.current.size < 2) pinch.current = null; };
  const onWheel = (e) => { const r = cvRef.current.getBoundingClientRect(); zoomAt(e.deltaY < 0 ? 1.25 : 0.8, e.clientX - r.left, e.clientY - r.top); };
  const centreOnMe = () => {
    const S = stateRef.current, map = wheelMapInfo();
    if (!S || !S.player || !map) return;
    const V = view.current;
    V.cx = S.player.x; V.cy = S.player.y;
    V.zoom = Math.max(V.zoom, 4);
    clampView(V, map);
    setZoomShown(V.zoom);
    dirty.current = true;
  };
  const zoomBtn = (f) => { const cv = cvRef.current; if (cv) zoomAt(f, cv.clientWidth / 2, cv.clientHeight / 2); };

  const btn = { appearance: 'none', width: 46, height: 46, borderRadius: 10, border: '1px solid rgba(216,170,88,0.55)', background: 'rgba(17,30,35,0.92)',
    color: INK, fontSize: 22, fontWeight: 700, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', touchAction: 'manipulation' };
  return (
    <div
      data-world-map=""
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      style={{ position: 'fixed', inset: 0, zIndex: 9200, background: '#0B161B', display: 'flex', flexDirection: 'column', touchAction: 'none' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 'calc(env(safe-area-inset-top, 0px) + 8px) 12px 8px', background: '#111E23', borderBottom: '1px solid rgba(216,170,88,0.35)' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: BRASS, fontWeight: 800, fontSize: 16, letterSpacing: '.04em' }}>The Wheel</div>
          <div data-world-map-where="" style={{ color: INK, fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{where ? `You are in ${where}` : 'Finding you…'}</div>
        </div>
        <button type="button" aria-label="Close the map" data-world-map-close="" onClick={onClose} style={{ ...btn, fontSize: 24 }}>×</button>
      </div>
      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <canvas
          ref={cvRef}
          data-world-map-canvas=""
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onWheel={onWheel}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', touchAction: 'none' }}
        />
        <div style={{ position: 'absolute', right: 12, bottom: 'calc(env(safe-area-inset-bottom, 0px) + 14px)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button type="button" aria-label="Zoom in" data-world-map-zoom-in="" onClick={() => zoomBtn(1.6)} style={btn}>+</button>
          <button type="button" aria-label="Zoom out" data-world-map-zoom-out="" onClick={() => zoomBtn(1 / 1.6)} style={btn}>−</button>
          <button type="button" aria-label="Back to you" data-world-map-me="" onClick={centreOnMe} style={{ ...btn, fontSize: 18 }}>◎</button>
        </div>
        <div style={{ position: 'absolute', left: 10, bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)', display: 'flex', flexWrap: 'wrap', gap: '4px 10px', maxWidth: 'calc(100% - 90px)',
          padding: '6px 9px', borderRadius: 8, background: 'rgba(17,30,35,0.85)', color: INK, fontSize: 11 }}>
          <Key shape="square" color={INK}>town</Key>
          <Key shape="tri" color={KIND.camp.color}>camp</Key>
          <Key shape="diamond" color={KIND.pass.color}>pass</Key>
          <Key shape="dot" color={KIND.gate.color}>gate</Key>
          <Key shape="dot" color={KIND.landmark.color}>landmark</Key>
          <Key shape="line" color="#F2E4C2">road</Key>
          <Key shape="line" color="#5AAEE8">river</Key>
          {zoomShown < AT.camp ? <span style={{ color: '#B6C1BE' }}>Zoom in for more names</span> : null}
        </div>
      </div>
    </div>
  );
}

function Key({ shape, color, children }) {
  const s = { display: 'inline-block', width: 9, height: 9, marginRight: 4, verticalAlign: -1, background: color };
  if (shape === 'dot') Object.assign(s, { borderRadius: 9 });
  if (shape === 'diamond') Object.assign(s, { transform: 'rotate(45deg) scale(.8)' });
  if (shape === 'tri') Object.assign(s, { background: 'none', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderBottom: `9px solid ${color}` });
  if (shape === 'line') Object.assign(s, { height: 3, width: 12, borderRadius: 2, verticalAlign: 2 });
  return <span style={{ whiteSpace: 'nowrap' }}><span style={s} />{children}</span>;
}

/* CSS px per game px at zoom 1: the whole Wheel fits, with a little room */
function baseScale(w, h, map) { return (Math.min(w, h) * 0.96) / Math.max(map.worldW, map.worldH); }
function clampView(V, map) {
  V.cx = Math.max(0, Math.min(map.worldW, V.cx));
  V.cy = Math.max(0, Math.min(map.worldH, V.cy));
}

/* ── drawing ── */
function draw(g, w, h, dpr, map, V, P, facing, t) {
  const k = baseScale(w, h, map) * V.zoom, z = V.zoom;
  const X = (x) => (x - V.cx) * k + w / 2, Y = (y) => (y - V.cy) * k + h / 2;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = '#16324A';
  g.fillRect(0, 0, w, h);
  /* the land, a touch darker for the labels -- v2.3.3024: each land one
     flat colour, as on the minimap (wheelTrial.js landsCanvas) */
  const ov = wheelOverviewLands();
  if (ov && ov.width) {
    g.imageSmoothingEnabled = true;
    g.drawImage(ov, X(0), Y(0), map.worldW * k, map.worldH * k);
    g.fillStyle = 'rgba(8, 14, 20, 0.16)';
    g.fillRect(0, 0, w, h);
  }
  /* the lines */
  const line = (want, width, color, dash) => {
    g.beginPath();
    for (const r of map.routes) {
      if (!want(r) || r.pts.length < 4) continue;
      g.moveTo(X(r.pts[0]), Y(r.pts[1]));
      for (let i = 2; i < r.pts.length; i += 2) g.lineTo(X(r.pts[i]), Y(r.pts[i + 1]));
    }
    g.lineWidth = width; g.strokeStyle = color; g.lineCap = 'round'; g.lineJoin = 'round';
    g.setLineDash(dash || []);
    g.stroke();
    g.setLineDash([]);
  };
  const lw = Math.min(4, 1 + z * 0.22);
  line((r) => r.kind === 'river', lw * 1.25, '#5AAEE8');
  line((r) => r.kind === 'rail', Math.max(1, lw * 0.6), 'rgba(43,35,32,0.9)', [4, 3]);
  line((r) => r.kind === 'road' && !r.trunk, Math.max(1, lw * 0.7), 'rgba(230,213,174,0.85)');
  line((r) => r.kind === 'road' && r.trunk, lw, 'rgba(242,228,194,0.95)');

  /* labels: placed in order of importance, each only where it clears the
     ones before it */
  const placed = [];
  const free = (x0, y0, x1, y1) => {
    if (x1 < 0 || y1 < 0 || x0 > w || y0 > h) return false;
    for (const r of placed) if (x0 < r[2] && x1 > r[0] && y0 < r[3] && y1 > r[1]) return false;
    return true;
  };
  const counts = { lands: 0, stages: 0, camps: 0, passes: 0, gates: 0, sites: 0, roads: 0 };
  /* a label of one or two lines centred on (x, y); `mark` draws its icon
     just above it */
  const label = (x, y, lines, opts = {}) => {
    const size = opts.size || 12, sub = opts.subSize || Math.max(10, size - 2);
    g.font = `${opts.weight || 700} ${size}px system-ui, -apple-system, sans-serif`;
    const w0 = g.measureText(lines[0]).width;
    g.font = `600 ${sub}px system-ui, -apple-system, sans-serif`;
    const w1 = lines[1] ? g.measureText(lines[1]).width : 0;
    const bw = Math.max(w0, w1), bh = size + (lines[1] ? sub + 3 : 0);
    /* `below`: (x, y) is the label's top middle, under an icon */
    const top = opts.below ? y : y - bh / 2;
    if (!opts.force && !free(x - bw / 2 - 3, top - 2, x + bw / 2 + 3, top + bh + 2)) return false;
    placed.push([x - bw / 2 - 3, top - 2, x + bw / 2 + 3, top + bh + 2]);
    g.textAlign = 'center'; g.textBaseline = 'top'; g.lineJoin = 'round';
    g.font = `${opts.weight || 700} ${size}px system-ui, -apple-system, sans-serif`;
    g.lineWidth = 3.5; g.strokeStyle = HALO; g.strokeText(lines[0], x, top);
    g.fillStyle = opts.color || INK; g.fillText(lines[0], x, top);
    if (lines[1]) {
      g.font = `600 ${sub}px system-ui, -apple-system, sans-serif`;
      g.strokeText(lines[1], x, top + size + 3);
      g.fillStyle = opts.subColor || BRASS; g.fillText(lines[1], x, top + size + 3);
    }
    return true;
  };
  const icon = (kind, x, y, s = 1) => {
    const c = (KIND[kind] && KIND[kind].color) || INK;
    g.beginPath();
    if (kind === 'camp') { g.moveTo(x, y - 6 * s); g.lineTo(x + 6 * s, y + 5 * s); g.lineTo(x - 6 * s, y + 5 * s); g.closePath(); }
    else if (kind === 'pass') { g.moveTo(x, y - 5 * s); g.lineTo(x + 5 * s, y); g.lineTo(x, y + 5 * s); g.lineTo(x - 5 * s, y); g.closePath(); }
    else g.arc(x, y, (kind === 'gate' ? 6 : 4.5) * s, 0, Math.PI * 2);
    g.fillStyle = c; g.fill();
    g.lineWidth = 1.5; g.strokeStyle = HALO; g.stroke();
  };

  /* you, first, so nothing covers you */
  if (P) {
    const px = X(P.x), py = Y(P.y);
    const pulse = 10 + 6 * (0.5 + 0.5 * Math.sin(t / 260));
    g.beginPath(); g.arc(px, py, pulse, 0, Math.PI * 2);
    g.lineWidth = 2; g.strokeStyle = 'rgba(234,198,117,0.85)'; g.stroke();
    const f = FACING.indexOf(facing || 'south');
    const a = f >= 0 ? (f * Math.PI) / 4 : Math.PI / 2;
    g.save(); g.translate(px, py); g.rotate(a);
    g.beginPath(); g.moveTo(9, 0); g.lineTo(-6, -6); g.lineTo(-3, 0); g.lineTo(-6, 6); g.closePath();
    g.fillStyle = INK; g.fill(); g.lineWidth = 1.5; g.strokeStyle = HALO; g.stroke();
    g.restore();
    placed.push([px - 18, py - 18, px + 18, py + 18]);
    label(px, py + 12, ['You'], { size: 11, below: true, force: true, color: BRASS });
  }
  /* the town */
  const T = map.hub.town;
  g.fillStyle = INK; g.fillRect(X(T.x) - 5, Y(T.y) - 5, 10, 10);
  g.lineWidth = 1.5; g.strokeStyle = HALO; g.strokeRect(X(T.x) - 5, Y(T.y) - 5, 10, 10);
  label(X(T.x), Y(T.y) + 8, [T.name], { size: 13, below: true, color: INK });
  /* the lands, until their stages take over: one line while the whole
     Wheel is on a phone's screen (eight names round a 370 px wheel only fit
     that way, and every land is levels 1-80), their element and levels
     beneath once there is room */
  if (z < AT.stage) {
    for (const L of map.lands) {
      const lines = z < AT.landSub ? [L.name.toUpperCase()] : [L.name.toUpperCase(), `${L.element ? `${L.element} · ` : ''}Lv ${L.levels[0]}–${L.levels[1]}`];
      if (label(X(L.x), Y(L.y), lines, { size: z < AT.landSub ? 12 : 14, subSize: 11 })) counts.lands++;
    }
  }
  /* the gates, and where they lead */
  for (const p of map.places) {
    if (p.kind !== 'gate') continue;
    icon('gate', X(p.x), Y(p.y));
    if (z >= AT.gateName && label(X(p.x), Y(p.y) + 8, [p.name, p.to ? `to ${p.to} · Lv 80–100` : ''].filter(Boolean), { size: 11.5, below: true, subColor: '#D9B8FF' })) counts.gates++;
  }
  if (z >= AT.commons) label(X(map.hub.commons.x), Y(map.hub.commons.y), [map.hub.commons.name, 'safe, no monsters'], { size: 11.5, weight: 600 });
  /* each land's stages */
  if (z >= AT.stage) {
    for (const st of map.stages) {
      const land = map.names[st.region] || '';
      if (label(X(st.x), Y(st.y), [st.name, `${land} · Lv ${st.levels[0]}–${st.levels[1]}`], { size: z < 3.4 ? 12 : 13.5, subSize: 10.5 })) counts.stages++;
    }
  }
  /* camps and passes, then the landmarks and other places */
  for (const p of map.places) {
    const x = X(p.x), y = Y(p.y);
    if (p.kind === 'camp' && z >= AT.camp) { icon('camp', x, y); if (label(x, y + 8, [p.name, `camp · Lv ${p.level}`], { size: 11, below: true })) counts.camps++; }
    else if (p.kind === 'pass' && z >= AT.pass) { icon('pass', x, y); if (label(x, y + 7, [p.name, `pass · Lv ${p.level}`], { size: 11, below: true, weight: 600 })) counts.passes++; }
    else if (p.kind === 'pass') icon('pass', x, y, 0.8);
    else if (p.kind === 'camp' && z >= 1.5) icon('camp', x, y, 0.8);
  }
  if (z >= AT.site) {
    for (const p of map.places) {
      if (p.kind !== 'landmark' && p.kind !== 'site' && p.kind !== 'falls') continue;
      const x = X(p.x), y = Y(p.y);
      icon(p.kind === 'falls' ? 'landmark' : p.kind, x, y);
      if (label(x, y + 7, [p.name], { size: 11, below: true, weight: 600, color: '#CFF2DE' })) counts.sites++;
    }
  }
  /* the roads' names, along each at its middle */
  if (z >= AT.road) {
    for (const r of map.routes) {
      if (r.kind === 'rail' || r.pts.length < 4) continue;
      const n = r.pts.length / 2, i = Math.max(0, Math.min(n - 2, Math.floor(n / 2)));
      const x0 = X(r.pts[i * 2]), y0 = Y(r.pts[i * 2 + 1]), x1 = X(r.pts[i * 2 + 2]), y1 = Y(r.pts[i * 2 + 3]);
      const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
      let a = Math.atan2(y1 - y0, x1 - x0);
      if (a > Math.PI / 2) a -= Math.PI; else if (a < -Math.PI / 2) a += Math.PI;
      g.font = 'italic 600 11px system-ui, -apple-system, sans-serif';
      const tw = g.measureText(r.name).width;
      const ext = Math.abs(Math.cos(a)) * tw / 2 + 7, eyt = Math.abs(Math.sin(a)) * tw / 2 + 7;
      if (!free(mx - ext, my - eyt, mx + ext, my + eyt)) continue;
      placed.push([mx - ext, my - eyt, mx + ext, my + eyt]);
      g.save(); g.translate(mx, my); g.rotate(a);
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 3; g.strokeStyle = HALO;
      g.strokeText(r.name, 0, 0); g.fillStyle = r.kind === 'river' ? '#BFE3FF' : '#F2E4C2'; g.fillText(r.name, 0, 0);
      g.restore();
      counts.roads++;
    }
  }
  return { labels: counts, k };
}
