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
   (cardinal edges + corners). Town is 40w × 30h, so:
     N  → top-center,    NE → top-right corner
     E  → right-center,  SE → bottom-right corner
     S  → bottom-center, SW → bottom-left corner
     W  → left-center,   NW → top-left corner
   Returning from any zone respawns at the same extreme. */
export const TOWN_EXITS = [
  { zoneId: 'meadow',  tx: 20, ty: 0,  dir: 'north', label: 'Starting Meadow ↑', color: '#5a9a40' },
  { zoneId: 'frost',   tx: 39, ty: 0,  dir: 'ne',    label: 'Frozen Shore ↗',    color: ELEMENTS.frost.color },
  { zoneId: 'ember',   tx: 39, ty: 15, dir: 'east',  label: 'Ember Fields →',    color: ELEMENTS.flame.color },
  { zoneId: 'thunder', tx: 39, ty: 29, dir: 'se',    label: 'Thunder Peaks ↘',   color: ELEMENTS.storm.color },
  { zoneId: 'sky',     tx: 20, ty: 29, dir: 'south', label: 'Sky Reaches ↓',     color: ELEMENTS.wind.color },
  { zoneId: 'hollows', tx: 0,  ty: 29, dir: 'sw',    label: '↙ Deep Hollows',    color: ELEMENTS.stone.color },
  { zoneId: 'mist',    tx: 0,  ty: 15, dir: 'west',  label: '← Mistwood',        color: ELEMENTS.venom.color },
  { zoneId: 'tidal',   tx: 0,  ty: 0,  dir: 'nw',    label: '↖ Tidal Caves',     color: ELEMENTS.water.color },
];
