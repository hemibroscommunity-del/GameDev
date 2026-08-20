import React, { useEffect, useRef, useState } from 'react';
import { COL, panelStyle, getState } from './common.js';
import { IMAGE_ZONE_MAPS } from '@/rendering/tiledMaps.js';
import { Assets } from 'pixi.js';
import { ZONES } from '@/data/zones.js';
import { TILE } from '@/data/constants.js';

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

  /* ═══ v2.3.1781: paint the REAL map, not a generated one ═══
     This used to draw `S.map` — generateZoneMap()'s procedural cross-paths,
     ring road and TOWN_BUILDINGS rectangles.  v2.3.1681 had already
     established that those rectangles are collision boxes rescaled from the
     old 40x30 tile village and line up with nothing in the painted town;
     once the town became a 96x30 clifftop plateau, this panel was showing a
     junction and a ring that exist nowhere in the game.  Nobody reported it
     because it is three taps deep, but it is exactly the failure a map is
     supposed to prevent.

     It now draws the same painted image the world is drawn from
     (IMAGE_ZONE_MAPS), which is already in the browser's HTTP cache because
     the zone gate loaded it — so this is a decode of cached bytes, not a
     network fetch, and it cannot drift from the art.

     WHOLE-ZONE fit here, deliberately unlike the HUD minimap's window
     (minimapRenderer.js): this panel is the "where am I in the zone" view,
     and letterboxing a 3.2:1 town inside the square is the honest way to
     show a zone that really is that shape. */
  useEffect(() => {
    const c = cv.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    const S = getState();
    const zoneId = S && S.currentZone;
    const zone = zoneId && ZONES[zoneId];
    const url = zoneId && IMAGE_ZONE_MAPS[zoneId];

    ctx.clearRect(0, 0, MINI_W, MINI_H);
    ctx.fillStyle = '#111E23';
    ctx.fillRect(0, 0, MINI_W, MINI_H);
    if (!zone || !url) return;

    const zoneW = zone.w * TILE, zoneH = zone.h * TILE;
    const k = Math.min(MINI_W / zoneW, MINI_H / zoneH);   /* contain */
    const dw = zoneW * k, dh = zoneH * k;
    const ox = (MINI_W - dw) / 2, oy = (MINI_H - dh) / 2;

    const draw = (img) => {
      try { ctx.drawImage(img, ox, oy, dw, dh); } catch (e) { return; }
      const P = S.player;
      if (!P) return;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(ox + (P.x / zoneW) * dw, oy + (P.y / zoneH) * dh, 3.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#F4F0E7';
      ctx.beginPath();
      ctx.arc(ox + (P.x / zoneW) * dw, oy + (P.y / zoneH) * dh, 2.2, 0, Math.PI * 2);
      ctx.fill();
    };

    /* Draw the EXACT HTMLImageElement the renderer is already holding, not a
       fresh Image() for the same url.  pixiRenderer.js forces
       preferCreateImageBitmap:false (v2.3.778, so textures survive an iOS GPU
       purge), which means every zone texture is <img>-backed and can be
       handed straight to canvas 2D.  Going through the Assets cache keeps
       this honest against the preloading law in CLAUDE.md: opening this panel
       triggers NO load of any kind, it reads what the zone gate already put
       there.  If the zone image somehow is not resident, the panel stays an
       empty well rather than kicking off a fetch. */
    let img = null;
    try {
      const tex = Assets.cache.get(url);
      const res = tex && tex.source && tex.source.resource;
      if (res && res.naturalWidth) img = res;
    } catch (e) { /* fall through to the empty well */ }
    if (img) draw(img);
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
