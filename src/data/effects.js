import { ELEMENTS } from './elements.js';

/* ═══════════════════════════════════════════════════════════════
   VISUAL EFFECT SYSTEM — Weapon-specific hits, element overlays,
   element-specific deaths. All code-drawn, no sprites needed.
   ═══════════════════════════════════════════════════════════════ */

export function spawnWeaponHitFX(hitX, hitY, kbAngle, weaponType, isCrit) {
  const parts = [];
  const scale = isCrit ? 1.6 : 1;
  const count = isCrit ? 1.4 : 1;

  if (weaponType === 'greatsword') {
    const arcStart = kbAngle - 0.8;
    const arcEnd = kbAngle + 0.8;
    for (let i = 0; i < Math.round(14 * count); i++) {
      const a = arcStart + Math.random() * (arcEnd - arcStart);
      const r = 8 + Math.random() * 16;
      parts.push({
        x: hitX + Math.cos(a) * r * 0.3, y: hitY + Math.sin(a) * r * 0.3,
        vx: Math.cos(a) * (2 + Math.random() * 3) * scale,
        vy: Math.sin(a) * (2 + Math.random() * 3) * scale - 1,
        life: 0.5, color: isCrit ? '#f5c542' : '#ddd',
        size: (2.5 + Math.random() * 2) * scale, type: 'slash',
      });
    }
    parts.push({ x: hitX, y: hitY, vx: Math.cos(kbAngle) * 1, vy: Math.sin(kbAngle) * 1,
      life: 0.3, color: '#fff', size: 6 * scale, type: 'flash' });
  } else if (weaponType === 'sword') {
    const perpA = kbAngle + Math.PI / 2;
    for (let i = 0; i < Math.round(10 * count); i++) {
      const t = (i / 10 - 0.5) * 2;
      parts.push({
        x: hitX + Math.cos(perpA) * t * 10, y: hitY + Math.sin(perpA) * t * 10,
        vx: Math.cos(kbAngle) * (3 + Math.random() * 2) * scale + (Math.random() - 0.5) * 2,
        vy: Math.sin(kbAngle) * (1 + Math.random()) * scale - Math.random(),
        life: 0.35, color: isCrit ? '#f5c542' : '#ccc',
        size: (1 + Math.random() * 1.5) * scale, type: 'slice',
      });
    }
  } else if (weaponType === 'bow') {
    for (let i = 0; i < Math.round(8 * count); i++) {
      const spread = (Math.random() - 0.5) * 1.2;
      parts.push({
        x: hitX, y: hitY,
        vx: Math.cos(kbAngle + spread + Math.PI) * (1 + Math.random() * 3) * scale,
        vy: Math.sin(kbAngle + spread + Math.PI) * (1 + Math.random() * 3) * scale - Math.random() * 2,
        life: 0.4, color: i < 3 ? '#8B6914' : '#ddd',
        size: (1 + Math.random() * 1.5) * scale, type: 'splinter',
      });
    }
    for (let i = 0; i < 4; i++) {
      parts.push({ x: hitX, y: hitY, vx: (Math.random() - 0.5) * 2, vy: -1 - Math.random() * 2,
        life: 0.5, color: 'rgba(200,180,140,0.6)', size: (3 + Math.random() * 2) * scale, type: 'dust' });
    }
  } else if (weaponType === 'staff') {
    for (let i = 0; i < Math.round(12 * count); i++) {
      const a = (i / 12) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      parts.push({
        x: hitX, y: hitY,
        vx: Math.cos(a) * (3 + Math.random() * 3) * scale,
        vy: Math.sin(a) * (3 + Math.random() * 3) * scale,
        life: 0.45, color: isCrit ? '#f5c542' : ['#a78bfa', '#c084fc', '#e9d5ff'][Math.floor(Math.random() * 3)],
        size: (1.5 + Math.random() * 2) * scale, type: 'magic',
      });
    }
    parts.push({ x: hitX, y: hitY, vx: 0, vy: -0.5, life: 0.4, color: '#e9d5ff', size: 5 * scale, type: 'glow' });
  }
  return parts;
}

export function spawnElementStatusFX(mx, my, element, tickRandom) {
  if (tickRandom > 0.15) return null;
  const e = ELEMENTS[element];
  if (!e) return null;
  const c = e.color;
  const fx = {
    flame: { x: mx + (Math.random() - 0.5) * 12, y: my + (Math.random() - 0.5) * 8, vx: (Math.random() - 0.5) * 0.8, vy: -1.5 - Math.random() * 2, life: 0.6 + Math.random() * 0.3, color: Math.random() > 0.3 ? c : '#F39C12', size: 1 + Math.random() * 1.5 },
    frost: { x: mx + (Math.random() - 0.5) * 14, y: my + (Math.random() - 0.5) * 10, vx: (Math.random() - 0.5) * 1.5, vy: (Math.random() - 0.5) * 1.5 - 0.5, life: 0.7 + Math.random() * 0.3, color: Math.random() > 0.4 ? c : '#AED6F1', size: 1.5 + Math.random() * 1 },
    water: { x: mx + (Math.random() - 0.5) * 10, y: my - 4 + Math.random() * 8, vx: (Math.random() - 0.5) * 0.5, vy: 0.5 + Math.random() * 2, life: 0.5 + Math.random() * 0.3, color: Math.random() > 0.5 ? c : '#85C1E9', size: 1 + Math.random() * 1 },
    venom: { x: mx + (Math.random() - 0.5) * 10, y: my + Math.random() * 6, vx: (Math.random() - 0.5) * 0.8, vy: -1 - Math.random() * 1.5, life: 0.5 + Math.random() * 0.4, color: Math.random() > 0.3 ? c : '#58D68D', size: 1.5 + Math.random() * 1.5 },
    storm: { x: mx + (Math.random() - 0.5) * 14, y: my + (Math.random() - 0.5) * 10, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6, life: 0.15 + Math.random() * 0.1, color: Math.random() > 0.5 ? c : '#D7BDE2', size: 1 + Math.random() * 0.5 },
    stone: { x: mx + (Math.random() - 0.5) * 12, y: my + (Math.random() - 0.5) * 6, vx: (Math.random() - 0.5) * 1, vy: 0.5 + Math.random() * 1, life: 0.6 + Math.random() * 0.3, color: Math.random() > 0.4 ? c : '#A0522D', size: 1.5 + Math.random() * 1.5 },
    wind: { x: mx + (Math.random() - 0.5) * 16, y: my + (Math.random() - 0.5) * 10, vx: 1.5 + Math.random() * 2, vy: (Math.random() - 0.5) * 2, life: 0.4 + Math.random() * 0.3, color: Math.random() > 0.5 ? c : '#BDC3C7', size: 1 + Math.random() * 1 },
    dark: { x: mx + (Math.random() - 0.5) * 18, y: my + (Math.random() - 0.5) * 14, vx: -(Math.random() - 0.5) * 0.5, vy: -(Math.random() - 0.5) * 0.5, life: 0.7 + Math.random() * 0.4, color: Math.random() > 0.6 ? c : '#1A1A2E', size: 2 + Math.random() * 2 },
    light: { x: mx + (Math.random() - 0.5) * 14, y: my + (Math.random() - 0.5) * 10, vx: (Math.random() - 0.5) * 1, vy: -0.8 - Math.random() * 1.5, life: 0.6 + Math.random() * 0.4, color: Math.random() > 0.3 ? c : '#FEF9E7', size: 1 + Math.random() * 1.5 },
  };
  return fx[element] || null;
}

export function getElementDeathFX(deathX, deathY, element, killAngle, bodyColor, bodySize, killScale) {
  const parts = [];
  const e = ELEMENTS[element];
  const c = e ? e.color : '#fff';
  const sc = killScale || 1;
  const bs = bodySize || 10;

  const styles = {
    flame: { deathStyle: 'incinerate', spawn() {
      for (let i = 0; i < Math.round(25 * sc); i++) {
        const isAsh = i > 15;
        parts.push({ x: deathX + (Math.random() - 0.5) * bs, y: deathY + (Math.random() - 0.5) * bs,
          vx: (Math.random() - 0.5) * 3, vy: isAsh ? 0.5 + Math.random() : -2 - Math.random() * 4,
          life: isAsh ? 1.2 : 0.8 + Math.random() * 0.5,
          color: isAsh ? '#333' : ['#C0392B', '#E74C3C', '#F39C12', '#F5B041'][Math.floor(Math.random() * 4)],
          size: (isAsh ? 1 : 1.5 + Math.random() * 2) * sc });
      }
    }},
    frost: { deathStyle: 'shatter', spawn() {
      for (let i = 0; i < Math.round(20 * sc); i++) {
        const a = Math.random() * Math.PI * 2; const spd = 2 + Math.random() * 5;
        parts.push({ x: deathX + (Math.random() - 0.5) * bs * 0.5, y: deathY + (Math.random() - 0.5) * bs * 0.5,
          vx: Math.cos(a) * spd * sc, vy: Math.sin(a) * spd * sc - 1,
          life: 0.8 + Math.random() * 0.5, color: ['#2980B9', '#AED6F1', '#D6EAF8', '#EBF5FB', '#fff'][Math.floor(Math.random() * 5)],
          size: (2 + Math.random() * 3) * sc, type: 'shard' });
      }
    }},
    water: { deathStyle: 'dissolve', spawn() {
      for (let i = 0; i < Math.round(22 * sc); i++) {
        const a = Math.random() * Math.PI * 2;
        parts.push({ x: deathX + (Math.random() - 0.5) * bs, y: deathY + (Math.random() - 0.5) * bs,
          vx: Math.cos(a) * (1 + Math.random() * 3) * sc, vy: -1 + Math.random() * 3,
          life: 0.6 + Math.random() * 0.4, color: ['#3498DB', '#5DADE2', '#85C1E9', '#AED6F1'][Math.floor(Math.random() * 4)],
          size: (1.5 + Math.random() * 2) * sc });
      }
    }},
    venom: { deathStyle: 'melt', spawn() {
      for (let i = 0; i < Math.round(20 * sc); i++) {
        const isGas = i < 8;
        parts.push({ x: deathX + (Math.random() - 0.5) * bs * 1.2, y: deathY + (isGas ? -Math.random() * 10 : Math.random() * 6),
          vx: (Math.random() - 0.5) * 2, vy: isGas ? -1.5 - Math.random() * 2 : 0.5 + Math.random(),
          life: isGas ? 0.5 : 1.0 + Math.random() * 0.5,
          color: isGas ? '#58D68D' : ['#27AE60', '#1E8449', '#145A32'][Math.floor(Math.random() * 3)],
          size: (isGas ? 1.5 : 2.5 + Math.random() * 2) * sc });
      }
    }},
    storm: { deathStyle: 'electrocute', spawn() {
      for (let i = 0; i < Math.round(18 * sc); i++) {
        const a = Math.random() * Math.PI * 2; const spd = 4 + Math.random() * 6;
        parts.push({ x: deathX, y: deathY, vx: Math.cos(a) * spd * sc, vy: Math.sin(a) * spd * sc,
          life: 0.2 + Math.random() * 0.2, color: ['#8E44AD', '#D7BDE2', '#fff', '#F4ECF7'][Math.floor(Math.random() * 4)],
          size: (1 + Math.random() * 1.5) * sc });
      }
      for (let i = 0; i < 8; i++) {
        parts.push({ x: deathX + (Math.random() - 0.5) * 20, y: deathY + (Math.random() - 0.5) * 20,
          vx: (Math.random() - 0.5), vy: (Math.random() - 0.5), life: 0.8 + Math.random() * 0.5,
          color: '#D7BDE2', size: 1 * sc });
      }
    }},
    stone: { deathStyle: 'crumble', spawn() {
      for (let i = 0; i < Math.round(16 * sc); i++) {
        parts.push({ x: deathX + (Math.random() - 0.5) * bs, y: deathY + (Math.random() - 0.5) * bs * 0.5,
          vx: (Math.random() - 0.5) * 3 * sc, vy: -1 + Math.random() * 2,
          life: 1.0 + Math.random() * 0.5, color: ['#795548', '#A0522D', '#8D6E63', '#6D4C41', '#999'][Math.floor(Math.random() * 5)],
          size: (2 + Math.random() * 3) * sc, type: 'chunk' });
      }
    }},
    wind: { deathStyle: 'scatter', spawn() {
      for (let i = 0; i < Math.round(20 * sc); i++) {
        const a = (i / 20) * Math.PI * 2; const spd = 2 + Math.random() * 4;
        parts.push({ x: deathX, y: deathY,
          vx: Math.cos(a) * spd * sc + (Math.random() - 0.5) * 2,
          vy: Math.sin(a) * spd * sc - 1 - Math.random() * 2,
          life: 0.6 + Math.random() * 0.4,
          color: i % 3 === 0 ? bodyColor : ['#7F8C8D', '#BDC3C7', '#ECF0F1'][Math.floor(Math.random() * 3)],
          size: (1.5 + Math.random() * 2) * sc });
      }
    }},
    dark: { deathStyle: 'implode', spawn() {
      for (let i = 0; i < Math.round(22 * sc); i++) {
        const a = Math.random() * Math.PI * 2; const r = 20 + Math.random() * 15;
        parts.push({ x: deathX + Math.cos(a) * r, y: deathY + Math.sin(a) * r,
          vx: -Math.cos(a) * (3 + Math.random() * 4) * sc, vy: -Math.sin(a) * (3 + Math.random() * 4) * sc,
          life: 0.6 + Math.random() * 0.3, color: ['#2C3E50', '#1A1A2E', '#0D0D1A', '#4A235A'][Math.floor(Math.random() * 4)],
          size: (2 + Math.random() * 2) * sc });
      }
    }},
    light: { deathStyle: 'purify', spawn() {
      for (let i = 0; i < Math.round(24 * sc); i++) {
        const isBeam = i < 6;
        parts.push({ x: deathX + (Math.random() - 0.5) * (isBeam ? 4 : bs * 1.5),
          y: deathY + (isBeam ? 0 : (Math.random() - 0.5) * bs),
          vx: (Math.random() - 0.5) * (isBeam ? 0.5 : 2),
          vy: isBeam ? -3 - Math.random() * 4 : -0.5 - Math.random() * 2,
          life: isBeam ? 1.0 : 0.6 + Math.random() * 0.4,
          color: isBeam ? '#fff' : ['#F1C40F', '#F4D03F', '#FEF9E7', '#fff'][Math.floor(Math.random() * 4)],
          size: (isBeam ? 1 : 1.5 + Math.random() * 2) * sc });
      }
    }},
  };

  const s = styles[element];
  if (s) { s.spawn(); return { particles: parts, deathStyle: s.deathStyle }; }
  return { particles: parts, deathStyle: 'default' };
}

export function getCollisionDeathFX(deathX, deathY, collisionId, killAngle, bodySize, killScale) {
  const parts = [];
  const sc = killScale || 1;
  const bs = bodySize || 10;

  if (collisionId === 'eclipse') {
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2; const r = 25 + Math.random() * 20;
      parts.push({ x: deathX + Math.cos(a) * r, y: deathY + Math.sin(a) * r,
        vx: -Math.cos(a) * (4 + Math.random() * 3) * sc, vy: -Math.sin(a) * (4 + Math.random() * 3) * sc,
        life: 1.2, color: i % 2 === 0 ? '#2C3E50' : '#F1C40F', size: (2 + Math.random() * 3) * sc });
    }
    for (let i = 0; i < 20; i++) {
      const a = Math.random() * Math.PI * 2;
      parts.push({ x: deathX, y: deathY, vx: Math.cos(a) * (1 + Math.random() * 2) * sc, vy: Math.sin(a) * (1 + Math.random() * 2) * sc,
        life: 1.5, color: i % 3 === 0 ? '#fff' : i % 3 === 1 ? '#F1C40F' : '#2C3E50', size: (1.5 + Math.random() * 2) * sc });
    }
  } else if (collisionId === 'steam' || collisionId === 'quench') {
    for (let i = 0; i < 25; i++) {
      parts.push({ x: deathX + (Math.random() - 0.5) * bs * 2, y: deathY + (Math.random() - 0.5) * bs,
        vx: (Math.random() - 0.5) * 2, vy: -1.5 - Math.random() * 3,
        life: 1.0 + Math.random() * 0.5, color: ['#ECF0F1', '#D5DBDB', '#fff', '#AEB6BF'][Math.floor(Math.random() * 4)],
        size: (3 + Math.random() * 4) * sc });
    }
  } else if (collisionId === 'shatter') {
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2; const spd = 3 + Math.random() * 7;
      parts.push({ x: deathX + (Math.random() - 0.5) * 4, y: deathY + (Math.random() - 0.5) * 4,
        vx: Math.cos(a) * spd * sc, vy: Math.sin(a) * spd * sc - 2,
        life: 0.7 + Math.random() * 0.4, color: i % 2 === 0 ? '#2980B9' : '#27AE60',
        size: (1.5 + Math.random() * 2.5) * sc });
    }
  } else if (collisionId === 'overcharge' || collisionId === 'divine_strike') {
    for (let i = 0; i < 35; i++) {
      const a = Math.random() * Math.PI * 2; const spd = 5 + Math.random() * 8;
      parts.push({ x: deathX, y: deathY, vx: Math.cos(a) * spd * sc, vy: Math.sin(a) * spd * sc,
        life: 0.3 + Math.random() * 0.3, color: i % 4 === 0 ? '#fff' : '#F1C40F',
        size: (2 + Math.random() * 3) * sc });
    }
  } else if (collisionId === 'hellfire') {
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2;
      parts.push({ x: deathX + (Math.random() - 0.5) * 8, y: deathY + (Math.random() - 0.5) * 8,
        vx: Math.cos(a) * (2 + Math.random() * 5) * sc, vy: Math.sin(a) * (2 + Math.random() * 5) * sc - 2,
        life: 0.7 + Math.random() * 0.4, color: ['#2C3E50', '#C0392B', '#E74C3C', '#1A1A2E', '#F39C12'][Math.floor(Math.random() * 5)],
        size: (2 + Math.random() * 3) * sc });
    }
  }
  return parts;
}

/* Zone exits in town — 8 zones at the 8 directional extremes
   (cardinal edges + corners).  Town is 32w × 32h, so:
     NW → top-left corner,    N  → top-center,    NE → top-right corner
     W  → left-center,                              E  → right-center
     SW → bottom-left corner, S  → bottom-center, SE → bottom-right corner
   Layout (clockwise from NW): Ice, Floral, Lightning, Water,
   Poison, Rock, Lava, Wind. Returning from any zone respawns
   at the same extreme. */
/* v2.3.387: tx/ty are now PROXIMITY trigger tiles placed on the painted
   path-ends (the pink markers on the town map), not edge cells -- the town
   exit logic switched from "reach the edge" to "walk near the marker". */
/* v2.3.859: town / world-view split. The cozy town (id 'town', keeps the
   buildings/services) has ONE exit -- the north trail up to the World View,
   the zoomed-out hub where the spokes branch. WORLDVIEW_EXITS holds those
   branches plus the way back down to town (the central town circle). */
/* v2.3.1693 (owner: "move the portals to and from the worldview to the zones a
   bit closer inside the map -- they're getting cut off by the dashboard a bit
   so they barely poke out"): the World View trail-head sat at ty 44 of town's
   48 rows, i.e. 4 tiles off the bottom edge.  The camera clamps to the map
   bottom, so those last rows render UNDER the bottom dashboard and the portal
   halo only half-showed.  Pulled 3 tiles inward (44 -> 41), which is the same
   PORTAL_EDGE_INSET the zone-side return markers now use (zoneTransitions.js).
   Still on the painted southern trail, just further up it.
   NOTE: tools/qa/mp/mp-townlock.mjs hardcodes this marker — keep them in
   step (it says so itself, and fails loudly if they drift). */
/* v2.3.1777: the clifftop town is 96x30 tiles, not 48x48 — ty 41 is off the
   bottom of the new zone entirely, so the only way out of town was a tile that
   no longer exists.  Moved to the plateau's southern lip, mid-map, which is
   open cobble in town_v16.walk.json and roughly where the old exit sat
   relative to the plaza. */
/* v2.3.1813: town_v17 is 52x55 tiles, not 96x30 — tx 56 is off the RIGHT edge
   of the new zone, the same failure mode as v2.3.1777's ty 41 one shape-change
   earlier.  Moved to the painted stone STAIRS on the plateau's southern lip,
   which is where a way down off a clifftop belongs and is open cobble in the
   new art (checked, every sample within 48px).  ty 48 of 55 keeps it clear of
   the bottom rows that render under the dashboard.
   tools/qa/mp/mp-townlock.mjs hardcodes this marker — kept in step. */
export const TOWN_EXITS = [
  { zoneId: 'worldview', tx: 25, ty: 48, dir: 'south', label: 'World View ↓', color: '#cdb27a' },
];

/* The World View is the second hub (see zoneTransitions hub logic). Trails
   radiate from the central town circle to every region. Positions are
   approximate (the zone is walkable-everywhere until a mask); tune them to the
   painted trail-heads later. */
/* v2.3.2074: the art under these is worldview_v4 now (the owner's new
   overworld). The coordinates are DELIBERATELY UNCHANGED -- the new map is a
   re-render of the same layout, and tools/maps/build_worldview_v4.py samples
   the painted trail under every marker on both maps and refuses to write if a
   live spoke loses more than 8 points of it. The note below still describes
   where these came from. */
/* v2.3.1359: trail-heads retuned to the owner's worldview_v2 art (the
   painted overworld: central walled town, volcano N, desert NE, crystal
   cave E, thunder dome SE, beach+pier S, gnarled mistwood SW, blossom
   verdant W, snow peaks NW).  Coords verified against a marker overlay
   on the actual art.  The town marker stays 3 tiles from the hub-entry
   spawn (24,31) — inside 2 re-triggers the v2.3.948 bounce. */
export const WORLDVIEW_EXITS = [
  { zoneId: 'town',    tx: 24, ty: 28, dir: 'north', label: 'Town',            color: '#cdb27a' },
  { zoneId: 'ember',   tx: 25, ty: 10, dir: 'north', label: 'Flame Fields',    color: ELEMENTS.flame.color },
  { zoneId: 'sky',     tx: 39, ty: 12, dir: 'ne',    label: 'Wind Dunes',    color: ELEMENTS.wind.color },
  /* v2.3.1411 (owner: "disable portals to sea level, lightning/tech
     building, the rock cave, and the poison forest — it's unfinished"):
     the four unfinished spokes are CLOSED for now.  Commenting them out
     here removes the walk-in trigger (zoneTransitions), the painted
     trail-head label (tileRenderer), and the minimap marker
     (gameDisplay) in one place — every consumer iterates this array.
     Uncomment to reopen. */
  // { zoneId: 'hollows', tx: 43, ty: 22, dir: 'east',  label: 'Stone Hollows',    color: ELEMENTS.stone.color },   /* rock/crystal cave */
  // { zoneId: 'thunder', tx: 42, ty: 36, dir: 'se',    label: 'Electric Foundry',   color: ELEMENTS.storm.color },   /* lightning/tech building */
  // { zoneId: 'tidal',   tx: 24, ty: 40, dir: 'south', label: 'Water Caves',     color: ELEMENTS.water.color },   /* sea level / beach+pier */
  // { zoneId: 'mist',    tx: 8,  ty: 32, dir: 'sw',    label: 'Poison Forest',        color: ELEMENTS.venom.color },   /* poison forest */
  { zoneId: 'verdant', tx: 7,  ty: 20, dir: 'nw',    label: 'Verdant Wilds',   color: '#6abf4f' },
  { zoneId: 'frost',   tx: 13, ty: 13, dir: 'nw',    label: 'Frost Ridge',    color: ELEMENTS.frost.color },
];

/* ═══ v2.3.1677: PAINTED, NOT PLAYABLE ═══
 * Owner: "put 'coming soon' over all buildings in town and over all zone
 * entry points that don't have a portal."
 *
 * The worldview art paints nine regions; only five have a live trail-head in
 * WORLDVIEW_EXITS above.  The other four are commented out up there — their
 * coordinates are kept HERE rather than left as dead comments, because a
 * commented-out exit tells a reader nothing and tells the PLAYER nothing at
 * all: they walk to a painted volcano and bounce off empty ground with no
 * explanation.  A label is the honest version of a disabled feature.
 *
 * To ship one of these, move it back into WORLDVIEW_EXITS and delete it here.
 * If both lists ever carry the same zone the exit wins — a live portal must
 * never be labelled "coming soon" — which the renderer enforces rather than
 * trusting these two lists to stay disjoint. */
export const COMING_SOON_MARKS = [
  { zoneId: 'hollows', tx: 43, ty: 22, label: 'Stone Hollows' },
  { zoneId: 'thunder', tx: 42, ty: 36, label: 'Electric Foundry' },
  { zoneId: 'tidal',   tx: 24, ty: 40, label: 'Water Caves' },
  { zoneId: 'mist',    tx: 8,  ty: 32, label: 'Poison Forest' },
];

/* ═══ v2.3.1681: WHERE THE TOWN'S BUILDINGS ACTUALLY ARE ═══
 * Owner: "There's a whole bunch of invisible buildings with coming soon on
 * them."
 *
 * v2.3.1677 placed the town labels at the centre of every TOWN_BUILDINGS
 * rectangle.  Those rectangles are COLLISION boxes inherited from the old
 * 40x30 tile village and linearly rescaled into the 48x48 grid — their own
 * file header says outright that "they don't have to line up perfectly with
 * the new town image".  There are twelve of them; the painted town has seven
 * buildings, in different places.  So the labels landed on bare cobblestone,
 * which is exactly what an "invisible building" looks like.
 *
 * These coordinates are measured off the art instead (/maps/town_v15.webp,
 * 1254x1254, stretched to 48x48 tiles = 1536 world px), so each label sits on
 * a roof you can actually see.  Cross-checked against the one landmark
 * already measured independently: NPC_DATA puts the Mayor's House door arch
 * at world (757, 317), and the house entry below lands its label at world
 * (752, 250) — on the roof, just above that door.
 *
 * Deliberately unlabelled beyond "Coming soon": naming buildings the art
 * doesn't name would be inventing content, and the one building whose sign a
 * player can read is the Mayor's House — which must NOT read as "the mayor is
 * coming soon" when he is standing right below it handing out the tutorial. */
/* ═══ v2.3.1777: EMPTY, BECAUSE THE NEW TOWN HAS NO BUILDINGS ═══
   Every coordinate below was measured off the OLD square map's painted roofs.
   The clifftop map is an empty plateau — the owner is placing building art on
   it — so each of those seven labels would now float on bare cobblestone,
   which is the exact bug the note above says v2.3.1681 fixed.  A label with no
   building under it is worse than no label: it tells the player there is
   something there to find.

   This list comes back one entry at a time as buildings are placed, or does
   not come back at all if they ship with real entrances instead. */
export const TOWN_SOON_MARKS = [];

/* v2.3.1813 dev probe: the town's exit markers, so mp-townmap can prove they
   sit on tiles the zone actually has.  Two shape changes in a row (v2.3.1777,
   v2.3.1813) left this marker off the map entirely. */
if (typeof window !== 'undefined') window.__btTownExits = () => TOWN_EXITS.slice();
