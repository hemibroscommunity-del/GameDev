import React, { useEffect, useRef, useState } from 'react';
import { COL, panelStyle, getState } from './common.js';

const MINI_W = 110, MINI_H = 110;

/* v2.3.1232: Lantern Slate pass (docs/LANTERN-SLATE-SPEC.md) — the
   minimap sits in a #121B20 well tray (bag-tray language: recessed =
   stored/passive content), zone name moves to the 12/600 zone style,
   and the Discovered list gets a module header with the current zone
   marked in brass (brass = the active selection, the one accent in
   this region).  The canvas painting effect — tile colors included —
   is world content, not chrome, and is untouched. */
const secHdr = {
  fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '.12em', color: COL.muted, marginBottom: 4,
};

export const MapPanel = () => {
  const cv = useRef(null);
  const [, force] = useState(0);

  useEffect(() => {
    const id = setInterval(() => force(v => v + 1), 500);
    return () => clearInterval(id);
  }, []);

  // Paint a tiny zone overview onto a small canvas — just zone tiles +
  // player dot. No tile-level fidelity needed at this size.
  useEffect(() => {
    const c = cv.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    const S = getState();
    const map = S?.map;
    if (!map || !map.length) {
      ctx.clearRect(0, 0, MINI_W, MINI_H);
      return;
    }
    const rows = map.length;
    const cols = map[0].length;
    const sx = MINI_W / cols, sy = MINI_H / rows;
    ctx.fillStyle = '#1a1d2e';
    ctx.fillRect(0, 0, MINI_W, MINI_H);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const t = map[y][x] | 0;
        if (!t) continue;
        if (t === 1) ctx.fillStyle = '#3a4762';        // wall / structure
        else if (t === 9) ctx.fillStyle = '#5b52ff';    // exit
        else if (t === 10) ctx.fillStyle = '#f5c542';   // dungeon
        else ctx.fillStyle = '#2d5a1e';                 // ground
        ctx.fillRect(x * sx, y * sy, Math.ceil(sx), Math.ceil(sy));
      }
    }
    // Player dot
    if (S.player && S.zoneTilesPx) {
      const px = (S.player.x / (cols * S.zoneTilesPx)) * MINI_W;
      const py = (S.player.y / (rows * S.zoneTilesPx)) * MINI_H;
      ctx.fillStyle = '#ff5e6c';
      ctx.beginPath();
      ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (S.player) {
      // Fallback — assume 32px tiles
      const px = (S.player.x / (cols * 32)) * MINI_W;
      const py = (S.player.y / (rows * 32)) * MINI_H;
      ctx.fillStyle = '#ff5e6c';
      ctx.beginPath();
      ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  const S = getState();
  const visited = (S?.rpg?._visitedZones || S?.visitedZones || []).slice(0, 8);
  const curZone = S?.currentZone;

  return (
    <div style={{ ...panelStyle, display: 'flex', gap: 12 }}>
      <div style={{ flex: '0 0 auto' }}>
        <div style={{
          background: COL.well,
          borderRadius: 10,
          padding: 4,
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,.44), inset 0 1px 0 rgba(255,255,255,.035)',
        }}>
          <canvas ref={cv} width={MINI_W} height={MINI_H} style={{
            display: 'block',
            background: '#1a1d2e',
            borderRadius: 8,
            imageRendering: 'pixelated',
          }} />
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: COL.text, marginTop: 5, textAlign: 'center' }}>
          {curZone || '–'}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
        <div style={secHdr}>Discovered</div>
        {visited.length === 0 ? (
          <div style={{ fontSize: 13, color: COL.muted }}>Nothing yet.</div>
        ) : visited.map((z, i) => (
          <div key={i} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            minHeight: 28,
            fontSize: 13.5,
            color: z === curZone ? COL.text : COL.text2,
            fontWeight: z === curZone ? 700 : 400,
          }}>
            <span style={{ width: 10, flex: '0 0 auto', color: COL.accent }}>
              {z === curZone ? '▸' : ''}
            </span>
            <span style={{ minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{z}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
