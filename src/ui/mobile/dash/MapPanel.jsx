import React, { useEffect, useRef, useState } from 'react';
import { COL, panelStyle, getState } from './common.js';

const MINI_W = 110, MINI_H = 110;

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
    <div style={{ ...panelStyle, display: 'flex', gap: 10 }}>
      <div style={{ flex: '0 0 auto' }}>
        <canvas ref={cv} width={MINI_W} height={MINI_H} style={{
          display: 'block',
          background: '#1a1d2e',
          border: `1px solid ${COL.tileBor}`,
          borderRadius: 4,
          imageRendering: 'pixelated',
        }} />
        <div style={{ fontSize: 10, color: COL.muted, marginTop: 3, textAlign: 'center' }}>
          {curZone || '–'}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
        <div style={{ fontSize: 11, color: COL.muted, marginBottom: 4 }}>Discovered</div>
        {visited.length === 0 ? (
          <div style={{ fontSize: 11, color: COL.muted }}>Nothing yet.</div>
        ) : visited.map((z, i) => (
          <div key={i} style={{
            fontSize: 12,
            padding: '2px 0',
            color: z === curZone ? COL.text : COL.muted,
          }}>
            {z === curZone ? '▸ ' : '  '}{z}
          </div>
        ))}
      </div>
    </div>
  );
};
