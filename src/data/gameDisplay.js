/* ═══ GAME DISPLAY — presentation-only tables & renderers ═══ */
/* v2.3.1186: split out of gameSystems.js (FINAL PLAN v2 session 3).
   Everything here is pure presentation: audio engine, achievements,
   cosmetic masks, tile colors, zone-map generation, emote/NPC/label
   tables.  The point of the split is to SHRINK the mirror-audit drift
   surface: server/test/mirror-audit.test.mjs pins the economy tables
   that must stay lockstep with server/src/data.js (ARCHETYPES,
   MONSTER_HP_CURVE, COOKING_RECIPES, QUEST_CHAINS, BLACKSMITH/
   WOODWORKING_TIERS, SKILL_GUILDS, GUILD_QUESTS, QUALITY_MULTS,
   RARITY_TIERS, DAMAGE_CHANNEL_PCT, WEAPON_CHANNELS) — those all stay
   in gameSystems.js, which re-exports this module so every importer
   keeps working unchanged (the class of bug behind the v2.3.1147
   sky-spawn incident lives in that file, not this one).
   MUST stay plain-node importable (server tests + balance sim import
   the data layer) and MUST NOT import from gameSystems.js (it imports
   us — a back-edge would be a circular-init TDZ hazard). */

import { TILE } from './constants.js';
import { ZONES } from './zones.js';
import { TOWN_BUILDINGS } from './buildings.js';
import { TOWN_EXITS, WORLDVIEW_EXITS } from './effects.js';

/* ── Babel helper polyfill (from pre-transpiled source) ── */
function _defineProperty(e, r, t) { return (r in e) ? Object.defineProperty(e, r, { value: t, enumerable: true, configurable: true, writable: true }) : e[r] = t, e; }

/* ═══ COSMETIC MASKS — §MASK ═══ */
/* Wearable face items. One active at a time. Stored in rpg._masks (owned) and rpg._activeMask */
export const MASKS = [{
  id: 'clown',
  name: 'Clown Mask',
  emoji: '🤡',
  cost: 200,
  minLvl: 1,
  desc: 'Honk honk.',
  colors: {
    face: '#fff',
    nose: '#ff0000',
    cheeks: '#ff69b4',
    eyes: '#2563eb'
  }
}, {
  id: 'troll',
  name: 'Troll Mask',
  emoji: '👹',
  cost: 350,
  minLvl: 10,
  desc: 'Chaos incarnate.',
  colors: {
    face: '#2d6b22',
    horns: '#5d4037',
    eyes: '#ff5e6c',
    mouth: '#1a1a1a'
  }
}, {
  id: 'anonymous',
  name: 'Anonymous Mask',
  emoji: '🎭',
  cost: 500,
  minLvl: 20,
  desc: 'We are legion.',
  colors: {
    face: '#f5f0e1',
    eyebrows: '#1a1a1a',
    smile: '#cc0000',
    cheeks: '#d4a9a9'
  }
}, {
  id: 'skull',
  name: 'Skull Mask',
  emoji: '💀',
  cost: 750,
  minLvl: 30,
  desc: 'Memento mori.',
  colors: {
    bone: '#e8e0d0',
    shadow: '#1a1a1a',
    cracks: '#8B8680',
    teeth: '#fff'
  }
}, {
  id: 'demon',
  name: 'Demon Mask',
  emoji: '👿',
  cost: 1000,
  minLvl: 40,
  desc: 'From the deep.',
  colors: {
    face: '#8B0000',
    horns: '#2a0000',
    eyes: '#f5c542',
    marks: '#ff5e6c'
  }
}, {
  id: 'cat',
  name: 'Cat Mask',
  emoji: '😺',
  cost: 150,
  minLvl: 5,
  desc: 'Purrfect disguise.',
  colors: {
    face: '#f5c542',
    ears: '#ea580c',
    nose: '#ff69b4',
    whiskers: '#3a3a3a'
  }
}, {
  id: 'robot',
  name: 'Robot Visor',
  emoji: '🤖',
  cost: 600,
  minLvl: 25,
  desc: 'BEEP BOOP.',
  colors: {
    face: '#607D8B',
    visor: '#00e5ff',
    antenna: '#b0b0b0',
    mouth: '#3dd497'
  }
}, {
  id: 'ghost',
  name: 'Ghost Sheet',
  emoji: '👻',
  cost: 300,
  minLvl: 15,
  desc: 'BOO!',
  colors: {
    face: '#f0f0f0',
    eyes: '#1a1a1a',
    blush: 'rgba(150,100,200,.3)'
  }
}, {
  id: 'ninja',
  name: 'Ninja Hood',
  emoji: '🥷',
  cost: 450,
  minLvl: 20,
  desc: 'Silent but deadly.',
  colors: {
    wrap: '#1a1a1a',
    eyes: '#dc2626',
    band: '#5b52ff'
  }
}, {
  id: 'crown',
  name: 'Royal Crown',
  emoji: '👑',
  cost: 2000,
  minLvl: 50,
  desc: 'Bow before me.',
  colors: {
    gold: '#f5c542',
    jewel: '#dc2626',
    trim: '#d4a030',
    velvet: '#5b0000'
  }
}, {
  id: 'alien',
  name: 'Alien Head',
  emoji: '👽',
  cost: 400,
  minLvl: 15,
  desc: 'Take me to your leader.',
  colors: {
    face: '#90EE90',
    eyes: '#1a1a1a',
    mouth: '#2d6b22'
  }
}, {
  id: 'pumpkin',
  name: 'Pumpkin Head',
  emoji: '🎃',
  cost: 300,
  minLvl: 10,
  desc: 'Spooky season never ends.',
  colors: {
    face: '#FF7518',
    eyes: '#f5c542',
    stem: '#2d6b22',
    mouth: '#1a1a1a'
  }
}, {
  id: 'rage',
  name: 'Rage Face',
  emoji: '🤬',
  cost: 500,
  minLvl: 25,
  desc: 'PURE ANGER.',
  colors: {
    face: '#dc2626',
    eyes: '#fff',
    brows: '#1a1a1a',
    veins: '#8B0000'
  }
}, {
  id: 'cool',
  name: 'Cool Shades',
  emoji: '😎',
  cost: 250,
  minLvl: 8,
  desc: 'Deal with it.',
  colors: {
    lens: '#1a1a1a',
    frame: '#333',
    shine: 'rgba(255,255,255,.3)'
  }
}, {
  id: 'monocle',
  name: 'Distinguished',
  emoji: '🧐',
  cost: 800,
  minLvl: 35,
  desc: 'Quite.',
  colors: {
    glass: 'rgba(200,220,255,.3)',
    frame: '#d4a030',
    chain: '#f5c542'
  }
}];

/* ═══ STAT-BASED VISUAL CHANGES — §STATVIS ═══ */
/* Character appearance subtly changes based on stat allocation */
export function getStatVisuals(rpg) {
  if (!rpg) return {};
  /* v2.3.1155: T1-only scoring — the retired T2 terms (ferocity /
     elementalMastery / fortification / restoration / influence) were
     ×0 for every live player since v2.3.910; the healer/leader
     archetypes now key off vitality/mind spreads instead of dead
     stats so they remain reachable. */
  var power = rpg.power || 0,
    vit = rpg.vitality || 0,
    end = rpg.endurance || 0;
  var agi = rpg.agility || 0,
    mind = rpg.mind || 0;
  var total = power + vit + end + agi + mind;
  if (total < 10) return {}; /* no visible changes below 10 total */

  /* Find dominant stat archetype */
  var archetypes = [{
    key: 'berserker',
    score: power * 2,
    color: '#dc2626',
    glow: 'rgba(220,38,38,.15)',
    scale: 1.08,
    desc: 'bulkier arms'
  }, {
    key: 'tank',
    score: vit * 2 + end,
    color: '#607D8B',
    glow: 'rgba(96,125,139,.12)',
    scale: 1.12,
    desc: 'wider torso'
  }, {
    key: 'mage',
    score: mind * 2,
    color: '#9333ea',
    glow: 'rgba(147,51,234,.15)',
    scale: 0.95,
    desc: 'arcane aura'
  }, {
    key: 'rogue',
    score: agi * 3,
    color: '#22c55e',
    glow: 'rgba(34,197,94,.1)',
    scale: 0.92,
    desc: 'sleeker frame'
  }, {
    key: 'healer',
    score: vit + mind,
    color: '#38bdf8',
    glow: 'rgba(56,189,248,.12)',
    scale: 1.0,
    desc: 'gentle glow'
  }, {
    key: 'leader',
    score: mind + agi,
    color: '#f5c542',
    glow: 'rgba(245,197,66,.1)',
    scale: 1.0,
    desc: 'commanding presence'
  }];
  archetypes.sort(function (a, b) {
    return b.score - a.score;
  });
  var dominant = archetypes[0];
  if (dominant.score < 15) return {}; /* need meaningful investment */

  /* Intensity scales with how specialized (0-1) */
  var intensity = Math.min(1, dominant.score / 150);
  return {
    archetype: dominant.key,
    glowColor: dominant.glow,
    accentColor: dominant.color,
    bodyScale: 1 + (dominant.scale - 1) * intensity,
    intensity: intensity,
    /* Specific visual tweaks */
    bulkArms: dominant.key === 'berserker' ? intensity * 3 : 0,
    widerTorso: dominant.key === 'tank' ? intensity * 4 : 0,
    slimmer: dominant.key === 'rogue' ? intensity * 2 : 0,
    arcaneParticles: dominant.key === 'mage' ? Math.floor(intensity * 3) : 0,
    healGlow: dominant.key === 'healer' ? intensity * 0.15 : 0,
    crownGlow: dominant.key === 'leader' ? intensity * 0.12 : 0
  };
}

/* Draw a mask on a head circle at (cx, cy) with radius r */
export function drawMask(ctx, maskId, cx, cy, r, now) {
  var mask = MASKS.find(function (m) {
    return m.id === maskId;
  });
  if (!mask) return;
  var c = mask.colors;
  ctx.save();
  if (maskId === 'clown') {
    ctx.fillStyle = c.face;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.nose;
    ctx.beginPath();
    ctx.arc(cx, cy + 1, r * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.cheeks;
    ctx.beginPath();
    ctx.arc(cx - r * 0.5, cy + r * 0.15, r * 0.2, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.5, cy + r * 0.15, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.eyes;
    ctx.beginPath();
    ctx.arc(cx - r * 0.3, cy - r * 0.2, r * 0.15, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.3, cy - r * 0.2, r * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(cx - r * 0.5, cy - r * 0.55, r, r * 0.15); /* red hair */
  } else if (maskId === 'troll') {
    ctx.fillStyle = c.face;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.horns;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.6, cy - r * 0.8);
    ctx.lineTo(cx - r * 0.3, cy - r * 0.2);
    ctx.lineTo(cx - r * 0.8, cy - r * 0.3);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + r * 0.6, cy - r * 0.8);
    ctx.lineTo(cx + r * 0.3, cy - r * 0.2);
    ctx.lineTo(cx + r * 0.8, cy - r * 0.3);
    ctx.fill();
    ctx.fillStyle = c.eyes;
    ctx.beginPath();
    ctx.arc(cx - r * 0.25, cy - r * 0.1, r * 0.15, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.25, cy - r * 0.1, r * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.mouth;
    ctx.fillRect(cx - r * 0.4, cy + r * 0.3, r * 0.8, r * 0.15);
  } else if (maskId === 'anonymous') {
    ctx.fillStyle = c.face;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.eyebrows;
    ctx.fillRect(cx - r * 0.5, cy - r * 0.35, r * 0.35, 2);
    ctx.fillRect(cx + r * 0.15, cy - r * 0.35, r * 0.35, 2);
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(cx - r * 0.25, cy - r * 0.1, r * 0.08, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.25, cy - r * 0.1, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = c.smile;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.35, cy + r * 0.2);
    ctx.quadraticCurveTo(cx, cy + r * 0.55, cx + r * 0.35, cy + r * 0.2);
    ctx.stroke();
    ctx.fillStyle = c.cheeks;
    ctx.beginPath();
    ctx.arc(cx - r * 0.5, cy + r * 0.1, r * 0.12, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.5, cy + r * 0.1, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
  } else if (maskId === 'skull') {
    ctx.fillStyle = c.bone;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.shadow;
    ctx.beginPath();
    ctx.arc(cx - r * 0.25, cy - r * 0.1, r * 0.2, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.25, cy - r * 0.1, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.shadow;
    ctx.beginPath();
    ctx.arc(cx, cy + r * 0.15, r * 0.12, 0, Math.PI * 2);
    ctx.fill(); /* nose */
    ctx.fillStyle = c.teeth;
    ctx.fillRect(cx - r * 0.35, cy + r * 0.4, r * 0.7, r * 0.12);
    ctx.fillStyle = c.shadow;
    for (var i = 0; i < 4; i++) ctx.fillRect(cx - r * 0.3 + i * r * 0.18, cy + r * 0.4, 1, r * 0.12); /* tooth gaps */
  } else if (maskId === 'demon') {
    ctx.fillStyle = c.face;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.horns;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.5, cy - r);
    ctx.lineTo(cx - r * 0.2, cy - r * 0.4);
    ctx.lineTo(cx - r * 0.7, cy - r * 0.5);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + r * 0.5, cy - r);
    ctx.lineTo(cx + r * 0.2, cy - r * 0.4);
    ctx.lineTo(cx + r * 0.7, cy - r * 0.5);
    ctx.fill();
    ctx.fillStyle = c.eyes;
    ctx.beginPath();
    ctx.arc(cx - r * 0.25, cy - r * 0.1, r * 0.15, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.25, cy - r * 0.1, r * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = c.marks;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.5, cy);
    ctx.lineTo(cx - r * 0.15, cy + r * 0.2);
    ctx.moveTo(cx + r * 0.5, cy);
    ctx.lineTo(cx + r * 0.15, cy + r * 0.2);
    ctx.stroke();
  } else if (maskId === 'cat') {
    ctx.fillStyle = c.face;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.ears;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.7, cy - r * 0.9);
    ctx.lineTo(cx - r * 0.2, cy - r * 0.5);
    ctx.lineTo(cx - r * 0.6, cy - r * 0.3);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + r * 0.7, cy - r * 0.9);
    ctx.lineTo(cx + r * 0.2, cy - r * 0.5);
    ctx.lineTo(cx + r * 0.6, cy - r * 0.3);
    ctx.fill();
    ctx.fillStyle = c.nose;
    ctx.beginPath();
    ctx.arc(cx, cy + r * 0.05, r * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = c.whiskers;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.15, cy + r * 0.1);
    ctx.lineTo(cx - r * 0.8, cy);
    ctx.moveTo(cx - r * 0.15, cy + r * 0.2);
    ctx.lineTo(cx - r * 0.8, cy + r * 0.2);
    ctx.moveTo(cx + r * 0.15, cy + r * 0.1);
    ctx.lineTo(cx + r * 0.8, cy);
    ctx.moveTo(cx + r * 0.15, cy + r * 0.2);
    ctx.lineTo(cx + r * 0.8, cy + r * 0.2);
    ctx.stroke();
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.25, cy - r * 0.15, r * 0.08, r * 0.15, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + r * 0.25, cy - r * 0.15, r * 0.08, r * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (maskId === 'robot') {
    ctx.fillStyle = c.face;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.fillStyle = c.visor;
    ctx.fillRect(cx - r * 0.7, cy - r * 0.3, r * 1.4, r * 0.35);
    var scanX = cx - r * 0.6 + now / 20 % r * 1.2;
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.4;
    ctx.fillRect(scanX, cy - r * 0.3, 2, r * 0.35);
    ctx.globalAlpha = 1;
    ctx.fillStyle = c.antenna;
    ctx.fillRect(cx - 1, cy - r - 4, 2, 6);
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(cx, cy - r - 5, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.mouth;
    ctx.fillRect(cx - r * 0.3, cy + r * 0.4, r * 0.6, 2);
    ctx.fillRect(cx - r * 0.3, cy + r * 0.5, r * 0.6, 2);
  } else if (maskId === 'ghost') {
    ctx.fillStyle = c.face;
    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.1, r * 1.1, 0, Math.PI * 2);
    ctx.fill();
    /* Wavy bottom */
    ctx.fillStyle = c.face;
    ctx.beginPath();
    ctx.moveTo(cx - r * 1.1, cy + r * 0.3);
    for (var w = 0; w < 6; w++) ctx.quadraticCurveTo(cx - r + w * r * 0.4, cy + r * (0.8 + Math.sin(now / 300 + w) * 0.15), cx - r + (w + 0.5) * r * 0.4, cy + r * 0.5);
    ctx.lineTo(cx + r * 1.1, cy + r * 0.3);
    ctx.fill();
    ctx.fillStyle = c.eyes;
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.3, cy - r * 0.15, r * 0.15, r * 0.22, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + r * 0.3, cy - r * 0.15, r * 0.15, r * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (maskId === 'ninja') {
    ctx.fillStyle = c.wrap;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.band;
    ctx.fillRect(cx - r, cy + r * 0.55, r * 2, r * 0.25);
    ctx.fillStyle = c.eyes;
    ctx.fillRect(cx - r * 0.6, cy - r * 0.15, r * 1.2, r * 0.22);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(cx - r * 0.25, cy - r * 0.05, r * 0.08, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.25, cy - r * 0.05, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
  } else if (maskId === 'crown') {
    /* Crown sits on top of head, doesn't replace it */
    ctx.fillStyle = c.gold;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.8, cy - r * 0.3);
    ctx.lineTo(cx - r * 0.6, cy - r * 1.1);
    ctx.lineTo(cx - r * 0.25, cy - r * 0.7);
    ctx.lineTo(cx, cy - r * 1.2);
    ctx.lineTo(cx + r * 0.25, cy - r * 0.7);
    ctx.lineTo(cx + r * 0.6, cy - r * 1.1);
    ctx.lineTo(cx + r * 0.8, cy - r * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = c.jewel;
    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.85, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3498DB';
    ctx.beginPath();
    ctx.arc(cx - r * 0.4, cy - r * 0.55, r * 0.08, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.4, cy - r * 0.55, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = c.trim;
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - r * 0.8, cy - r * 0.3, r * 1.6, r * 0.15);
  } else if (maskId === 'alien') {
    ctx.fillStyle = c.face;
    ctx.beginPath();
    ctx.ellipse(cx, cy - r * 0.1, r * 0.85, r * 1.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.eyes;
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.3, cy - r * 0.2, r * 0.2, r * 0.12, -0.3, 0, Math.PI * 2);
    ctx.ellipse(cx + r * 0.3, cy - r * 0.2, r * 0.2, r * 0.12, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.mouth;
    ctx.beginPath();
    ctx.ellipse(cx, cy + r * 0.3, r * 0.15, r * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (maskId === 'pumpkin') {
    ctx.fillStyle = c.face;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.05, 0, Math.PI * 2);
    ctx.fill();
    /* Ridges */
    ctx.strokeStyle = '#CC5500';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx, cy + r);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.5, cy - r * 0.9);
    ctx.lineTo(cx - r * 0.5, cy + r * 0.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + r * 0.5, cy - r * 0.9);
    ctx.lineTo(cx + r * 0.5, cy + r * 0.9);
    ctx.stroke();
    /* Face */
    ctx.fillStyle = c.eyes;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.45, cy - r * 0.3);
    ctx.lineTo(cx - r * 0.2, cy - r * 0.1);
    ctx.lineTo(cx - r * 0.45, cy - r * 0.05);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + r * 0.45, cy - r * 0.3);
    ctx.lineTo(cx + r * 0.2, cy - r * 0.1);
    ctx.lineTo(cx + r * 0.45, cy - r * 0.05);
    ctx.fill();
    ctx.fillStyle = c.mouth;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.4, cy + r * 0.2);
    for (var t = 0; t < 5; t++) ctx.lineTo(cx - r * 0.4 + t * r * 0.2, cy + r * (t % 2 === 0 ? 0.2 : 0.45));
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = c.stem;
    ctx.fillRect(cx - 2, cy - r * 1.1, 4, r * 0.2);
  } else if (maskId === 'rage') {
    ctx.fillStyle = c.face;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    /* Angry brows */
    ctx.fillStyle = c.brows;
    ctx.save();
    ctx.translate(cx - r * 0.3, cy - r * 0.35);
    ctx.rotate(-0.3);
    ctx.fillRect(-r * 0.25, 0, r * 0.4, r * 0.08);
    ctx.restore();
    ctx.save();
    ctx.translate(cx + r * 0.3, cy - r * 0.35);
    ctx.rotate(0.3);
    ctx.fillRect(-r * 0.15, 0, r * 0.4, r * 0.08);
    ctx.restore();
    ctx.fillStyle = c.eyes;
    ctx.beginPath();
    ctx.arc(cx - r * 0.25, cy - r * 0.1, r * 0.12, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.25, cy - r * 0.1, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(cx - r * 0.25, cy - r * 0.08, r * 0.06, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.25, cy - r * 0.08, r * 0.06, 0, Math.PI * 2);
    ctx.fill();
    /* Veins */
    ctx.strokeStyle = c.veins;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.6, cy - r * 0.4);
    ctx.lineTo(cx - r * 0.35, cy - r * 0.2);
    ctx.moveTo(cx + r * 0.6, cy - r * 0.4);
    ctx.lineTo(cx + r * 0.35, cy - r * 0.2);
    ctx.stroke();
    /* Gritting teeth */
    ctx.fillStyle = '#fff';
    ctx.fillRect(cx - r * 0.35, cy + r * 0.3, r * 0.7, r * 0.15);
    ctx.fillStyle = '#1a1a1a';
    for (var _i13 = 0; _i13 < 5; _i13++) ctx.fillRect(cx - r * 0.3 + _i13 * r * 0.15, cy + r * 0.3, 1, r * 0.15);
  } else if (maskId === 'cool') {
    /* Sunglasses on top of normal face */
    ctx.fillStyle = c.frame;
    ctx.fillRect(cx - r * 0.8, cy - r * 0.3, r * 1.6, r * 0.08);
    ctx.fillStyle = c.lens;
    ctx.fillRect(cx - r * 0.7, cy - r * 0.25, r * 0.55, r * 0.35);
    ctx.fillRect(cx + r * 0.15, cy - r * 0.25, r * 0.55, r * 0.35);
    ctx.fillStyle = c.shine;
    ctx.fillRect(cx - r * 0.65, cy - r * 0.22, r * 0.15, r * 0.08);
    ctx.fillRect(cx + r * 0.2, cy - r * 0.22, r * 0.15, r * 0.08);
  } else if (maskId === 'monocle') {
    /* Monocle over right eye */
    ctx.strokeStyle = c.frame;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx + r * 0.25, cy - r * 0.1, r * 0.25, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = c.glass;
    ctx.beginPath();
    ctx.arc(cx + r * 0.25, cy - r * 0.1, r * 0.24, 0, Math.PI * 2);
    ctx.fill();
    /* Chain */
    ctx.strokeStyle = c.chain;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(cx + r * 0.25, cy + r * 0.15);
    ctx.quadraticCurveTo(cx + r * 0.5, cy + r * 0.5, cx + r * 0.1, cy + r * 0.7);
    ctx.stroke();
  }
  ctx.restore();
}

/* Generate a zone map. Town has buildings+paths. Combat zones have themed terrain. */
export function generateZoneMap(zoneId) {
  var zone = ZONES[zoneId];
  var W = zone.w,
    H = zone.h;
  var map = Array.from({
    length: H
  }, function () {
    return Array(W).fill(0);
  });
  var MX = Math.floor(W / 2),
    MY = Math.floor(H / 2);
  if (zoneId === 'town') {
    /* ═══ TOWN — paths, buildings, exits ═══ */
    /* Main cross paths */
    for (var x = 0; x < W; x++) {
      map[MY][x] = 1;
      map[MY + 1][x] = 1;
    }
    for (var y = 0; y < H; y++) {
      map[y][MX] = 1;
      map[y][MX + 1] = 1;
    }
    /* Ring path around center */
    var ringR = 8;
    for (var a = 0; a < 360; a += 1) {
      var rx = Math.round(MX + Math.cos(a * Math.PI / 180) * ringR);
      var ry = Math.round(MY + Math.sin(a * Math.PI / 180) * ringR);
      if (rx >= 0 && rx < W && ry >= 0 && ry < H) map[ry][rx] = 1;
    }
    /* Buildings */
    TOWN_BUILDINGS.forEach(function (b) {
      for (var dy = 0; dy < b.bh; dy++) for (var dx = 0; dx < b.bw; dx++) {
        var ty = b.by + dy,
          tx = b.bx + dx;
        if (ty >= 0 && ty < H && tx >= 0 && tx < W) map[ty][tx] = 3;
      }
    });
    /* Flowers near buildings */
    TOWN_BUILDINGS.forEach(function (b) {
      for (var i = 0; i < 6; i++) {
        var fx = b.bx + Math.floor(Math.random() * (b.bw + 4)) - 2;
        var fy = b.by + b.bh + Math.floor(Math.random() * 2);
        if (fx >= 0 && fx < W && fy >= 0 && fy < H && map[fy][fx] === 0) map[fy][fx] = 5;
      }
    });
    /* v2.3.388: exit portal markers (type 8) at each exit's tile -- the
       painted path-ends marked on the town art -- for ALL 8 exits incl.
       diagonals (previously only the 4 cardinals got a marker, placed at
       the map edge).  A 2x2 block makes the pulsing portal glow read as a
       circle over the path.  The procedural exit PATHS are dropped: the
       town renders the painted image, which already shows the paths. */
    TOWN_EXITS.forEach(function (ex) {
      for (var _my = -1; _my <= 0; _my++) for (var _mx = -1; _mx <= 0; _mx++) {
        var _ry = ex.ty + _my, _rx = ex.tx + _mx;
        if (_ry >= 0 && _ry < H && _rx >= 0 && _rx < W) map[_ry][_rx] = 8;
      }
    });
    /* Scattered trees */
    for (var i = 0; i < 30; i++) {
      var tx = Math.floor(Math.random() * W),
        ty = Math.floor(Math.random() * H);
      if (map[ty][tx] === 0) map[ty][tx] = 4;
    }
    /* Pond near center */
    for (var dy = -2; dy <= 2; dy++) for (var dx = -3; dx <= 3; dx++) {
      if (Math.sqrt(dx * dx + dy * dy) < 2.8) {
        var py = MY - 5 + dy,
          px = MX + 8 + dx;
        if (py >= 0 && py < H && px >= 0 && px < W && map[py][px] === 0) map[py][px] = 2;
      }
    }
  } else if (zoneId === 'worldview') {
    /* ═══ WORLD VIEW — trail-head portal markers only (v2.3.1303) ═══
       Owner bug report: "in world view it's not clear where the portals
       are because they're invisible" — and they always were.  The v2.3.859
       town/worldview split gave the worldview its WORLDVIEW_EXITS
       (proximity-triggered, zoneTransitions hub logic) but never a
       generateZoneMap branch, so the zone fell through to the combat-zone
       else below: its 9 real trail-heads got NO tile-8 markers (nothing
       for tileRenderer's portal-glow pass to draw), while the generic
       south-entrance tile 9 + north dungeon tile 10 painted two spurious
       halos where no exit exists.  The zone is a painted image, fully
       walkable (isSolid short-circuits on IMAGE_ZONE_MAPS), so the ONLY
       job of this map is the marker tiles: leave everything else 0 and
       stamp a 2x2 tile-8 block at each trail-head, exactly like the
       TOWN_EXITS loop above. */
    WORLDVIEW_EXITS.forEach(function (ex) {
      for (var _wy = -1; _wy <= 0; _wy++) for (var _wx = -1; _wx <= 0; _wx++) {
        var _wry = ex.ty + _wy, _wrx = ex.tx + _wx;
        if (_wry >= 0 && _wry < H && _wrx >= 0 && _wrx < W) map[_wry][_wrx] = 8;
      }
    });
  } else if (zoneId === 'farm_home') {
    /* ═══ PERSONAL FARM — house, plots, garden, path to exit ═══ */
    /* Grass everywhere */
    for (var _y5 = 0; _y5 < H; _y5++) for (var _x4 = 0; _x4 < W; _x4++) map[_y5][_x4] = 0;

    /* Path from entrance (south) to house (north-center) */
    for (var _y6 = 3; _y6 < H; _y6++) {
      map[_y6][MX] = 1;
      map[_y6][MX + 1] = 1;
    }

    /* House — 5x4 building tiles in upper area */
    var hx = MX - 2,
      hy = 3;
    for (var _dy3 = 0; _dy3 < 4; _dy3++) for (var _dx3 = 0; _dx3 < 5; _dx3++) map[hy + _dy3][hx + _dx3] = 3;
    /* House door — walkable path tile at center bottom */
    map[hy + 3][MX] = 1;
    map[hy + 3][MX + 1] = 1;

    /* Farm plots — 3x2 grid of sand tiles (tilled soil) on the left */
    for (var _py = 0; _py < 3; _py++) for (var _px = 0; _px < 4; _px++) {
      var fx = 3 + _px,
        fy = 10 + _py * 3;
      for (var _dy4 = 0; _dy4 < 2; _dy4++) for (var _dx4 = 0; _dx4 < 3; _dx4++) {
        if (fy + _dy4 < H && fx + _dx4 < W) map[fy + _dy4][fx + _dx4] = 6;
      }
    }

    /* Garden — flower tiles on the right */
    for (var gy = 10; gy < 18; gy++) for (var gx = W - 8; gx < W - 3; gx++) {
      if (Math.random() < 0.6) map[gy][gx] = 5;
    }

    /* Fence border — trees around edges */
    for (var _x5 = 0; _x5 < W; _x5++) {
      map[0][_x5] = 4;
      map[1][_x5] = 4;
      map[H - 1][_x5] = 4;
    }
    for (var _y7 = 0; _y7 < H; _y7++) {
      map[_y7][0] = 4;
      map[_y7][1] = 4;
      map[_y7][W - 1] = 4;
      map[_y7][W - 2] = 4;
    }

    /* Return exit at bottom */
    map[H - 1][MX] = 9;
    map[H - 1][MX + 1] = 9;
    map[H - 2][MX] = 1;
    map[H - 2][MX + 1] = 1;

    /* Water feature — small pond */
    for (var _dy5 = -1; _dy5 <= 1; _dy5++) for (var _dx5 = -2; _dx5 <= 2; _dx5++) {
      var px2 = W - 6 + _dx5,
        py2 = 6 + _dy5;
      if (px2 > 1 && px2 < W - 2 && py2 > 1 && py2 < H - 2 && _dx5 * _dx5 + _dy5 * _dy5 * 2 < 6) map[py2][px2] = 2;
    }

    /* Store house location for sleep mechanic */
    ZONES.farm_home._house = {
      x: (hx + 2) * TILE,
      y: (hy + 2) * TILE,
      w: 5 * TILE,
      h: 4 * TILE
    };

    /* §DNG — Dungeon Workshop building (right side of farm) */
    var dwx = W - 8,
      dwy = 10;
    for (var _dy6 = 0; _dy6 < 3; _dy6++) for (var _dx6 = 0; _dx6 < 4; _dx6++) map[dwy + _dy6][dwx + _dx6] = 7;
    /* Door at center bottom */
    map[dwy + 2][dwx + 1] = 1;
    map[dwy + 2][dwx + 2] = 1;
    ZONES.farm_home._workshop = {
      x: (dwx + 2) * TILE,
      y: (dwy + 1) * TILE,
      w: 4 * TILE,
      h: 3 * TILE
    };

    /* §PET — Pet House (left side of farm, below plots) */
    var phx = 3,
      phy = 19;
    for (var _dy7 = 0; _dy7 < 3; _dy7++) for (var _dx7 = 0; _dx7 < 4; _dx7++) map[phy + _dy7][phx + _dx7] = 7;
    map[phy + 2][phx + 1] = 1;
    map[phy + 2][phx + 2] = 1; /* door */
    /* Pet pen — fenced grass area next to pet house */
    for (var _dy8 = 0; _dy8 < 3; _dy8++) for (var _dx8 = 0; _dx8 < 5; _dx8++) {
      if (phy + _dy8 < H - 1 && phx + 5 + _dx8 < W - 2) map[phy + _dy8][phx + 5 + _dx8] = 5; /* flower/grass pen */
    }
    ZONES.farm_home._petHouse = {
      x: (phx + 2) * TILE,
      y: (phy + 1) * TILE,
      w: 4 * TILE,
      h: 3 * TILE
    };
  } else {
    /* ═══ COMBAT ZONE — single entrance (south), dungeon at far north ═══ */
    var elem = zone.element;

    /* All edges are walls (tile 7 = rock/wall) except south entrance */
    for (var _x6 = 0; _x6 < W; _x6++) {
      map[0][_x6] = 7;
      map[H - 1][_x6] = 7;
    }
    for (var _y8 = 0; _y8 < H; _y8++) {
      map[_y8][0] = 7;
      map[_y8][W - 1] = 7;
    }

    /* South entrance — 4-tile-wide gap in the south wall = return to town (tile 9) */
    for (var _dx1 = -2; _dx1 <= 1; _dx1++) {
      map[H - 1][MX + _dx1] = 9;
      map[H - 2][MX + _dx1] = 1; /* path leading in */
    }

    /* Main road from south entrance to dungeon at north */
    for (var _y9 = 2; _y9 < H - 2; _y9++) {
      map[_y9][MX] = 1;
      map[_y9][MX + 1] = 1;
    }

    /* Side paths branching off the main road */
    var branchYs = [Math.floor(H * 0.3), Math.floor(H * 0.5), Math.floor(H * 0.7)];
    branchYs.forEach(function (by) {
      /* Left branch */
      for (var _x7 = 3; _x7 < MX; _x7++) map[by][_x7] = 1;
      /* Right branch */
      for (var _x8 = MX + 2; _x8 < W - 3; _x8++) map[by][_x8] = 1;
    });

    /* Dungeon entrance (tile 10) at the far north end of the road */
    var dungX = MX,
      dungY = 2;
    map[dungY][dungX] = 10;
    map[dungY][dungX + 1] = 10;
    /* Short path to dungeon */
    map[dungY + 1][dungX] = 1;
    map[dungY + 1][dungX + 1] = 1;

    /* ═══ ZONE-SPECIFIC TERRAIN PATTERNS ═══ */
    /* Seeded random for consistent terrain per zone */
    var _seed = zoneId.split('').reduce(function (a, c) {
      return a + c.charCodeAt(0);
    }, 0);
    var _sr = function _sr(i) {
      var s = _seed * 9301 + i * 49297 + 49831;
      s = (s * s >>> 0) % 233280;
      return s / 233280;
    };
    var _si = 0;
    var sr = function sr() {
      return _sr(_si++);
    };
    if (elem === 'flame') {
      /* EMBER FIELDS: Lava rivers cutting through scorched earth, volcanic rock clusters */
      /* Lava rivers — sinuous water-tile streams (rendered as lava via zone tinting) */
      for (var rv = 0; rv < 3; rv++) {
        var _rx = Math.floor(sr() * W * 0.6) + Math.floor(W * 0.2);
        var _ry = 2;
        while (_ry < H - 2) {
          if (map[_ry][_rx] === 0) map[_ry][_rx] = 2; /* lava = water tile tinted by zone */
          if (_rx > 1 && map[_ry][_rx - 1] === 0) map[_ry][_rx - 1] = 2;
          _rx += Math.floor(sr() * 3) - 1;
          _rx = Math.max(2, Math.min(W - 3, _rx));
          _ry++;
        }
      }
      /* Volcanic rock clusters — irregular stone blobs */
      for (var vc = 0; vc < 8; vc++) {
        var vcx = Math.floor(sr() * (W - 8)) + 4,
          vcy = Math.floor(sr() * (H - 8)) + 4;
        var vcr = 2 + Math.floor(sr() * 2);
        for (var _dy1 = -vcr; _dy1 <= vcr; _dy1++) for (var _dx10 = -vcr; _dx10 <= vcr; _dx10++) {
          if (Math.sqrt(_dx10 * _dx10 + _dy1 * _dy1) <= vcr + sr() * 0.8) {
            var _ty = vcy + _dy1,
              _tx = vcx + _dx10;
            if (_ty > 0 && _ty < H - 1 && _tx > 0 && _tx < W - 1 && map[_ty][_tx] === 0) map[_ty][_tx] = 7;
          }
        }
      }
      /* Charred stumps (sparse trees) */
      for (var _i14 = 0; _i14 < 8; _i14++) {
        var _map$_ty;
        var _tx2 = Math.floor(sr() * W),
          _ty2 = Math.floor(sr() * H);
        if (((_map$_ty = map[_ty2]) === null || _map$_ty === void 0 ? void 0 : _map$_ty[_tx2]) === 0) map[_ty2][_tx2] = 4;
      }
    } else if (elem === 'frost') {
      /* FROZEN SHORE: Large ice sheets (water), snow drifts (sand), frozen trees */
      /* Ice lake — large frozen body of water in center-west */
      var iceX = Math.floor(W * 0.25),
        iceY = Math.floor(H * 0.3);
      for (var _dy10 = -6; _dy10 <= 6; _dy10++) for (var _dx11 = -8; _dx11 <= 8; _dx11++) {
        if (_dx11 * _dx11 / (8 * 8) + _dy10 * _dy10 / (6 * 6) < 1 + sr() * 0.2) {
          var _ty3 = iceY + _dy10,
            _tx3 = iceX + _dx11;
          if (_ty3 > 0 && _ty3 < H - 1 && _tx3 > 0 && _tx3 < W - 1 && map[_ty3][_tx3] === 0) map[_ty3][_tx3] = 2;
        }
      }
      /* Snow drifts (sand tiles rendered white via zone) — windswept banks */
      for (var sd = 0; sd < 12; sd++) {
        var sx2 = Math.floor(sr() * W),
          sy2 = Math.floor(sr() * H);
        for (var _dx12 = -3; _dx12 <= 3; _dx12++) for (var _dy11 = -1; _dy11 <= 1; _dy11++) {
          var _tx4 = sx2 + _dx12,
            _ty4 = sy2 + _dy11;
          if (_ty4 > 0 && _ty4 < H - 1 && _tx4 > 0 && _tx4 < W - 1 && map[_ty4][_tx4] === 0) map[_ty4][_tx4] = 6;
        }
      }
      /* Frozen trees — sparse, along edges */
      for (var _i15 = 0; _i15 < 15; _i15++) {
        var _map$_ty2;
        var _tx5 = Math.floor(sr() * W),
          _ty5 = Math.floor(sr() * H);
        if (((_map$_ty2 = map[_ty5]) === null || _map$_ty2 === void 0 ? void 0 : _map$_ty2[_tx5]) === 0) map[_ty5][_tx5] = 4;
      }
      /* Scattered ice patches */
      for (var _i16 = 0; _i16 < 20; _i16++) {
        var _map$_ty3;
        var _tx6 = Math.floor(sr() * W),
          _ty6 = Math.floor(sr() * H);
        if (((_map$_ty3 = map[_ty6]) === null || _map$_ty3 === void 0 ? void 0 : _map$_ty3[_tx6]) === 0) map[_ty6][_tx6] = 2;
      }
    } else if (elem === 'venom') {
      /* MISTWOOD: Dense canopy with winding paths through bogs */
      /* Dense tree clusters forming walls */
      for (var tc = 0; tc < 12; tc++) {
        var tcx = Math.floor(sr() * (W - 6)) + 3,
          tcy = Math.floor(sr() * (H - 6)) + 3;
        var tcr = 2 + Math.floor(sr() * 3);
        for (var _dy12 = -tcr; _dy12 <= tcr; _dy12++) for (var _dx13 = -tcr; _dx13 <= tcr; _dx13++) {
          if (Math.abs(_dx13) + Math.abs(_dy12) <= tcr + Math.floor(sr() * 2)) {
            var _ty7 = tcy + _dy12,
              _tx7 = tcx + _dx13;
            if (_ty7 > 0 && _ty7 < H - 1 && _tx7 > 0 && _tx7 < W - 1 && map[_ty7][_tx7] === 0) map[_ty7][_tx7] = 4;
          }
        }
      }
      /* Bog pools — small murky water patches */
      for (var bp = 0; bp < 8; bp++) {
        var bpx = Math.floor(sr() * (W - 4)) + 2,
          bpy = Math.floor(sr() * (H - 4)) + 2;
        for (var _dy13 = -1; _dy13 <= 1; _dy13++) for (var _dx14 = -2; _dx14 <= 2; _dx14++) {
          if (Math.abs(_dx14) + Math.abs(_dy13) <= 2) {
            var _ty8 = bpy + _dy13,
              _tx8 = bpx + _dx14;
            if (_ty8 > 0 && _ty8 < H - 1 && _tx8 > 0 && _tx8 < W - 1 && map[_ty8][_tx8] === 0) map[_ty8][_tx8] = 2;
          }
        }
      }
      /* Mushroom meadows (flowers) */
      for (var _i17 = 0; _i17 < 15; _i17++) {
        var _map$_ty4;
        var _tx9 = Math.floor(sr() * W),
          _ty9 = Math.floor(sr() * H);
        if (((_map$_ty4 = map[_ty9]) === null || _map$_ty4 === void 0 ? void 0 : _map$_ty4[_tx9]) === 0) map[_ty9][_tx9] = 5;
      }
    } else if (elem === 'storm') {
      /* THUNDER PEAKS: Rocky mountain ridges, open plateaus, lightning-scarred ground */
      /* Mountain ridges — long horizontal stone bands */
      for (var ridge = 0; ridge < 4; ridge++) {
        var ry2 = Math.floor(H * 0.15) + Math.floor(sr() * H * 0.7);
        var rxStart = Math.floor(sr() * Math.floor(W * 0.3));
        var rxEnd = rxStart + Math.floor(W * 0.3) + Math.floor(sr() * Math.floor(W * 0.4));
        for (var _rx2 = rxStart; _rx2 < Math.min(rxEnd, W - 1); _rx2++) {
          var thickness = 1 + Math.floor(sr() * 2);
          for (var t = 0; t < thickness; t++) {
            var _ty0 = ry2 + t;
            if (_ty0 > 0 && _ty0 < H - 1 && _rx2 > 0 && map[_ty0][_rx2] === 0) map[_ty0][_rx2] = 7;
          }
        }
      }
      /* Scattered boulders */
      for (var _i18 = 0; _i18 < 15; _i18++) {
        var _map$_ty5;
        var _tx0 = Math.floor(sr() * W),
          _ty1 = Math.floor(sr() * H);
        if (((_map$_ty5 = map[_ty1]) === null || _map$_ty5 === void 0 ? void 0 : _map$_ty5[_tx0]) === 0) map[_ty1][_tx0] = 7;
      }
      /* Lightning-blasted trees (sparse) */
      for (var _i19 = 0; _i19 < 6; _i19++) {
        var _map$_ty6;
        var _tx1 = Math.floor(sr() * W),
          _ty10 = Math.floor(sr() * H);
        if (((_map$_ty6 = map[_ty10]) === null || _map$_ty6 === void 0 ? void 0 : _map$_ty6[_tx1]) === 0) map[_ty10][_tx1] = 4;
      }
    } else if (elem === 'stone') {
      /* DEEP HOLLOWS: Cave walls funneling paths, crystal deposits, stalagmites */
      /* Cave wall borders — thick stone perimeter leaving inner cavern */
      for (var y2 = 0; y2 < H; y2++) for (var x2 = 0; x2 < W; x2++) {
        if (map[y2][x2] !== 0) continue;
        var edgeDist = Math.min(x2, y2, W - 1 - x2, H - 1 - y2);
        if (edgeDist < 3 + Math.floor(sr() * 3)) {
          map[y2][x2] = 7; /* cave wall */
        }
      }
      /* Stalagmite clusters — scattered stone pillars inside */
      for (var sg = 0; sg < 12; sg++) {
        var _map$sgy, _map;
        var sgx = 5 + Math.floor(sr() * (W - 10)),
          sgy = 5 + Math.floor(sr() * (H - 10));
        if (((_map$sgy = map[sgy]) === null || _map$sgy === void 0 ? void 0 : _map$sgy[sgx]) === 0) map[sgy][sgx] = 7;
        if (((_map = map[sgy - 1]) === null || _map === void 0 ? void 0 : _map[sgx]) === 0) map[sgy - 1][sgx] = 7;
      }
      /* Crystal deposits (flowers rendered as crystals via zone) */
      for (var _i20 = 0; _i20 < 10; _i20++) {
        var _map$_ty7;
        var _tx10 = 5 + Math.floor(sr() * (W - 10)),
          _ty11 = 5 + Math.floor(sr() * (H - 10));
        if (((_map$_ty7 = map[_ty11]) === null || _map$_ty7 === void 0 ? void 0 : _map$_ty7[_tx10]) === 0) map[_ty11][_tx10] = 5;
      }
    } else if (elem === 'wind') {
      /* SKY REACHES: Wide open plateaus, cloud wisps (flowers), floating island gaps */
      /* Cloud patches (flowers) — large clusters */
      for (var cp = 0; cp < 10; cp++) {
        var cpx = Math.floor(sr() * W),
          cpy = Math.floor(sr() * H);
        var cpr = 2 + Math.floor(sr() * 3);
        for (var _dy14 = -cpr; _dy14 <= cpr; _dy14++) for (var _dx15 = -cpr * 2; _dx15 <= cpr * 2; _dx15++) {
          if (_dx15 * _dx15 / (cpr * cpr * 4) + _dy14 * _dy14 / (cpr * cpr) < 1) {
            var _ty12 = cpy + _dy14,
              _tx11 = cpx + _dx15;
            if (_ty12 > 0 && _ty12 < H - 1 && _tx11 > 0 && _tx11 < W - 1 && map[_ty12][_tx11] === 0) map[_ty12][_tx11] = 5;
          }
        }
      }
      /* Floating island gaps — water chasms */
      for (var g = 0; g < 3; g++) {
        var _gx = Math.floor(sr() * (W - 6)) + 3,
          _gy = Math.floor(sr() * (H - 6)) + 3;
        for (var _dy15 = -2; _dy15 <= 2; _dy15++) for (var _dx16 = -4; _dx16 <= 4; _dx16++) {
          if (Math.abs(_dx16 * _dy15) < 6) {
            var _ty13 = _gy + _dy15,
              _tx12 = _gx + _dx16;
            if (_ty13 > 0 && _ty13 < H - 1 && _tx12 > 0 && _tx12 < W - 1 && map[_ty13][_tx12] === 0) map[_ty13][_tx12] = 2;
          }
        }
      }
      /* Very sparse wind-bent trees */
      for (var _i21 = 0; _i21 < 5; _i21++) {
        var _map$_ty8;
        var _tx13 = Math.floor(sr() * W),
          _ty14 = Math.floor(sr() * H);
        if (((_map$_ty8 = map[_ty14]) === null || _map$_ty8 === void 0 ? void 0 : _map$_ty8[_tx13]) === 0) map[_ty14][_tx13] = 4;
      }
    } else if (elem === 'water') {
      /* TIDAL CAVES: Coastline with sand/water gradients, coral formations, tidal pools */
      /* Large tidal pool in upper area */
      var poolX = Math.floor(W * 0.5),
        poolY = Math.floor(H * 0.25);
      for (var _dy16 = -5; _dy16 <= 5; _dy16++) for (var _dx17 = -10; _dx17 <= 10; _dx17++) {
        if (_dx17 * _dx17 / (10 * 10) + _dy16 * _dy16 / (5 * 5) < 1 + sr() * 0.15) {
          var _ty15 = poolY + _dy16,
            _tx14 = poolX + _dx17;
          if (_ty15 > 0 && _ty15 < H - 1 && _tx14 > 0 && _tx14 < W - 1 && map[_ty15][_tx14] === 0) map[_ty15][_tx14] = 2;
        }
      }
      /* Sandy beach borders around water */
      for (var _y0 = 1; _y0 < H - 1; _y0++) for (var _x9 = 1; _x9 < W - 1; _x9++) {
        if (map[_y0][_x9] !== 0) continue;
        var nearWater = false;
        for (var _dy17 = -1; _dy17 <= 1; _dy17++) for (var _dx18 = -1; _dx18 <= 1; _dx18++) {
          var _map2;
          if (((_map2 = map[_y0 + _dy17]) === null || _map2 === void 0 ? void 0 : _map2[_x9 + _dx18]) === 2) nearWater = true;
        }
        if (nearWater && sr() < 0.6) map[_y0][_x9] = 6;
      }
      /* Coral formations (stone) */
      for (var _i22 = 0; _i22 < 8; _i22++) {
        var _map$_ty9;
        var _tx15 = Math.floor(sr() * W),
          _ty16 = Math.floor(sr() * H);
        if (((_map$_ty9 = map[_ty16]) === null || _map$_ty9 === void 0 ? void 0 : _map$_ty9[_tx15]) === 0) map[_ty16][_tx15] = 7;
      }
      /* Seaweed patches (trees) */
      for (var _i23 = 0; _i23 < 10; _i23++) {
        var _map$_ty0;
        var _tx16 = Math.floor(sr() * W),
          _ty17 = Math.floor(sr() * H);
        if (((_map$_ty0 = map[_ty17]) === null || _map$_ty0 === void 0 ? void 0 : _map$_ty0[_tx16]) === 0) map[_ty17][_tx16] = 4;
      }
      /* Extra scattered water */
      for (var _i24 = 0; _i24 < 25; _i24++) {
        var _map$_ty1;
        var _tx17 = Math.floor(sr() * W),
          _ty18 = Math.floor(sr() * H);
        if (((_map$_ty1 = map[_ty18]) === null || _map$_ty1 === void 0 ? void 0 : _map$_ty1[_tx17]) === 0 && sr() < 0.5) map[_ty18][_tx17] = 2;
      }
    } else if (elem === 'dark') {
      /* SHADOW SANCTUM: Void cracks, ritual circles, oppressive dark trees */
      /* Dense shadow trees — clustered walls */
      for (var _tc = 0; _tc < 15; _tc++) {
        var _tcx = Math.floor(sr() * (W - 4)) + 2,
          _tcy = Math.floor(sr() * (H - 4)) + 2;
        var _tcr = 1 + Math.floor(sr() * 2);
        for (var _dy18 = -_tcr; _dy18 <= _tcr; _dy18++) for (var _dx19 = -_tcr; _dx19 <= _tcr; _dx19++) {
          if (_dx19 * _dx19 + _dy18 * _dy18 <= _tcr * _tcr + 1) {
            var _ty19 = _tcy + _dy18,
              _tx18 = _tcx + _dx19;
            if (_ty19 > 0 && _ty19 < H - 1 && _tx18 > 0 && _tx18 < W - 1 && map[_ty19][_tx18] === 0) map[_ty19][_tx18] = 4;
          }
        }
      }
      /* Void cracks — thin water (rendered as void via zone) */
      for (var _vc = 0; _vc < 4; _vc++) {
        var vx = 2 + Math.floor(sr() * (W - 4)),
          vy = 2 + Math.floor(sr() * (H - 4));
        for (var step = 0; step < 12; step++) {
          if (vy > 0 && vy < H - 1 && vx > 0 && vx < W - 1 && map[vy][vx] === 0) map[vy][vx] = 2;
          vx += Math.floor(sr() * 3) - 1;
          vy += Math.floor(sr() * 3) - 1;
          vx = Math.max(1, Math.min(W - 2, vx));
          vy = Math.max(1, Math.min(H - 2, vy));
        }
      }
      /* Dark ritual altars (stone) */
      for (var _i25 = 0; _i25 < 6; _i25++) {
        var _map$_ty10;
        var _tx19 = Math.floor(sr() * W),
          _ty20 = Math.floor(sr() * H);
        if (((_map$_ty10 = map[_ty20]) === null || _map$_ty10 === void 0 ? void 0 : _map$_ty10[_tx19]) === 0) map[_ty20][_tx19] = 7;
      }
    } else if (elem === 'light') {
      /* RADIANT HEIGHTS: Crystal spires, golden meadows, symmetrical clearings */
      /* Golden meadow patches (flowers) — large circles */
      for (var gm = 0; gm < 8; gm++) {
        var gmx = Math.floor(sr() * (W - 6)) + 3,
          gmy = Math.floor(sr() * (H - 6)) + 3;
        var gmr = 2 + Math.floor(sr() * 2);
        for (var _dy19 = -gmr; _dy19 <= gmr; _dy19++) for (var _dx20 = -gmr; _dx20 <= gmr; _dx20++) {
          if (_dx20 * _dx20 + _dy19 * _dy19 <= gmr * gmr) {
            var _ty21 = gmy + _dy19,
              _tx20 = gmx + _dx20;
            if (_ty21 > 0 && _ty21 < H - 1 && _tx20 > 0 && _tx20 < W - 1 && map[_ty21][_tx20] === 0) map[_ty21][_tx20] = 5;
          }
        }
      }
      /* Crystal spires (stone — rendered as light pillars) */
      for (var cs = 0; cs < 10; cs++) {
        var _map$csy;
        var csx = Math.floor(sr() * (W - 4)) + 2,
          csy = Math.floor(sr() * (H - 4)) + 2;
        if (((_map$csy = map[csy]) === null || _map$csy === void 0 ? void 0 : _map$csy[csx]) === 0) {
          map[csy][csx] = 7;
          if (csy > 1 && map[csy - 1][csx] === 0) map[csy - 1][csx] = 7;
        }
      }
      /* Sparse white trees */
      for (var _i26 = 0; _i26 < 8; _i26++) {
        var _map$_ty11;
        var _tx21 = Math.floor(sr() * W),
          _ty22 = Math.floor(sr() * H);
        if (((_map$_ty11 = map[_ty22]) === null || _map$_ty11 === void 0 ? void 0 : _map$_ty11[_tx21]) === 0) map[_ty22][_tx21] = 4;
      }
    } else {
      /* MEADOW / fallback: gentle rolling terrain */
      for (var _y1 = 0; _y1 < H; _y1++) for (var _x0 = 0; _x0 < W; _x0++) {
        if (map[_y1][_x0] !== 0) continue;
        if (sr() < 0.04) map[_y1][_x0] = 4; /* trees */else if (sr() < 0.03) map[_y1][_x0] = 5; /* flowers */else if (sr() < 0.02) map[_y1][_x0] = 2; /* ponds */
      }
    }
  }
  return map;
}

/* Tile rendering colors — indexed by tile type */
export const TILE_COLORS_BASE = {
  0: '#2d5a1e',
  /* grass */
  1: '#8b7355',
  /* path */
  2: '#2a6ca8',
  /* water */
  3: '#4a3a5c',
  /* building */
  4: '#1a4a12',
  /* tree */
  5: '#2d5a1e',
  /* flower (grass base) */
  6: '#d4b483',
  /* sand */
  7: '#6b6b6b',
  /* stone/mountain */
  8: '#5b52ff',
  /* zone exit (glowing) */
  9: '#3dd497',
  /* return exit (glowing) */
  10: '#ff5e6c',
  /* dungeon entrance (glowing red) */
  11: '#4a4a4a',
  /* fence (solid barrier) */
  12: '#6a5a3a',
  /* gate (climbable fence opening) */
  13: '#7a5a3a',
  /* house building (farm) */
  14: '#5a4a2a',
  /* farm plot (plantable) */
  15: '#6a4a5a' /* bed (sleep to recharge) */
};

/* Get zone-tinted tile color */
export function getTileColor(tile, zoneId) {
  var zone = ZONES[zoneId];
  if (!zone) return TILE_COLORS_BASE[tile] || '#2d5a1e';
  if (tile === 0) return zone.palette.ground;
  if (tile === 1) return zone.palette.path;
  return TILE_COLORS_BASE[tile] || zone.palette.ground;
}

export const TILE_COLORS = TILE_COLORS_BASE;

export const EMOTES = ['👋', '😂', '🔥', '💎', '🎉', '👀', '💪', '🕺', '🫡', '🤝', '💀', '😤', '🧘', '🎭', '❤️', '👏', '🏆', '🎣', '😴', '🤙', '6️⃣', '7️⃣', '🤷', '🙏', '😎', '🥶', '💃', '🪩', '🎤', '🫶'];
/* Signature emotes with labels */
export const EMOTE_LABELS = {
  '6️⃣': 'Six',
  '7️⃣': 'Seven',
  '🕺': 'Gritty',
  '💪': 'Flex',
  '🫡': 'Salute',
  '🤝': 'GG',
  '💀': 'RIP',
  '🎣': 'Cast',
  '🏆': 'Champ',
  '😤': 'Rage',
  '🧘': 'Zen',
  '🎭': 'Drama',
  '💃': 'Dance',
  '🪩': 'Party',
  '🫶': 'Love'
};
/* Special text emotes rendered as floating text above player */
export const TEXT_EMOTES = ['67', 'GG', 'RIP', 'Bruh', 'EZ', 'F', 'Lets go', 'Wow', 'Gritty', 'gg ez', 'Champion', 'Salute'];

/* ═══ AUDIO ENGINE — §6 Candy Crush Principle: every interaction has precise audio ═══ */
export const BT_AUDIO = _defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty({
  ctx: null,
  muted: false,
  _currentZoneAmbient: null,
  _ambientOsc: null,
  _ambientGain: null,
  _ambientLfo: null,
  /* Zone music — Web Audio source + gain for the looping MP3 in
     zones with a real composed track. Plays through the same
     AudioContext as the oscillators, which the game's first user
     gesture already unlocks. (HTMLAudio has a *separate* autoplay
     gate that the AudioContext unlock doesn't satisfy, which is why
     the previous `new Audio()` approach silently failed even though
     the oscillator drone played fine.) */
  _zoneMusicSource: null,
  _zoneMusicGain: null,
  _zoneMusicBuffers: {}, /* { [trackUrl]: AudioBuffer } cache — BUDGETED, see below */
  _zoneMusicUrl: null,   /* current track url; abandons stale fetches */
  _zoneMusicLru: [],     /* trackUrls, most-recently-used first */
  /* v2.3.1577: GLOBAL music — one track that starts on the login screen and
     plays unbroken for the whole session.  Deliberately NOT a ZONE_MUSIC
     entry: that map is per-zone and startZoneAmbient stops the old track and
     starts the new one on every zone change, so the same url in every zone
     would RESTART the song at each boundary.  This lives in its own pair of
     nodes that stopAmbient never touches, so zone ambience (and any future
     per-zone track) can come and go underneath it. */
  _globalMusicSource: null,
  _globalMusicGain: null,
  _globalMusicBuffer: null,
  _globalMusicStarting: false,
  /* v2.3.1103: EMPTIED — the owner removed all background music tracks
     (~40 MB) to shrink the download. With no entry here, startZoneAmbient()
     falls through to the low-volume procedural oscillator drone (generated,
     zero bytes) for every zone, so there's no music fetch and nothing 404s.
     To restore a track, re-add `<zoneId>: '/audio/music/<file>.mp3'` AND
     ship the file back into public/audio/music/. */
  ZONE_MUSIC: {
    town: '/audio/music/village.mp3',
    worldview: '/audio/music/world.mp3',
    frost: '/audio/music/frost.mp3',
    ember: '/audio/music/fire.mp3',   /* "fire zone" = Flame Fields */
    meadow: '/audio/music/forest.mp3', /* owner: "forest meadow area where the
                                          slimes are" — Starting Meadow, the
                                          green zone that spawns 10 plain
                                          slimes.  NOT mist, which is literally
                                          named Poison Forest but is a mid-game
                                          band with violet slime reskins. */
    /* "desert zone" = Wind Dunes; zones.js:44 calls it desert(sky) and its
       palette is the v2.3.855 warm desert one.
       v2.3.1589: ?v= CACHE-BUSTER, and the reason it is on this entry alone.
       The desert track's CONTENT has now been replaced twice at a stable
       filename (v2.3.1587, v2.3.1589) — and unlike every image path in this
       repo, the music fetch carries no version query, while `public/` is
       copied verbatim by vite rather than content-hashed.  So the URL was
       byte-identical across a swap and a returning player could keep playing
       the OLD score out of their HTTP cache indefinitely.  The other six
       entries have never had their bytes changed under them, so they are left
       alone (edit only what the change makes true); add a bump here on every
       future desert swap, or a `?v=` to any other entry the first time its
       file is replaced.  Safe against the LRU: the map value is the cache key
       AND the only thing `trackUrl` is ever compared to (_zoneMusicUrl), so
       both sides move together. */
    sky: '/audio/music/desert.mp3?v=2.3.1589',
  },
  /* NOTE for whoever adds the remaining zones: every ZONES entry also carries a
     `music: '<id>'` field.  It is read NOWHERE — dead early-design remnant, all
     14 of them.  Do NOT "restore" it by wiring this map through it (the doc-trust
     rule in CLAUDE.md: dormant systems need the owner first).  Keyed by zone id
     here is the working path. */
  /* v2.3.1578: the session track — starts at the login screen and plays for
     the whole session (the owner picked this over v2.3.1577's neondrift,
     which is removed rather than left to ship 3 MB nobody plays).

     128 kbps CBR, 44.1 kHz stereo, 1.56 MB for 1m42s — 36% off the 2.43 MB
     source.  A HIGHER bitrate than neondrift got, deliberately: this track is
     far brighter (energy above 15 kHz measures -40.3 dB against neondrift's
     -55.3), so the same 96 kbps cost 3.0 dB up there instead of 1.8, and the
     file is small enough that the 0.4 MB saved was not worth an audible
     trade.  80 kbps falls off a cliff (-6.5 dB) — do not go there for this
     one.

     MP3 rather than the smaller AAC: decodeAudioData REFUSED the m4a
     candidates in a real browser check while the mp3 decoded cleanly, and
     this whole path is decodeAudioData. */
  /* v2.3.1581: town gets its own track.  A zone entry here TAKES OVER from
     GLOBAL_MUSIC while the player is in that zone — see the ducking in
     startZoneAmbient.  Without that they would simply play at once, because
     the session track deliberately lives outside stopAmbient's reach.
     128 kbps, 2.07 MB for 2m16s (37% off the 3.28 MB source); same bitrate
     as login-theme and for the same measured reason — this track is bright
     (>15 kHz at -42.7 dB), so 96k would cost 2.1 dB up there to save 0.5 MB.
     v2.3.1582: worldview gets world.mp3 — 128 kbps, 2.25 MB for 2m27s off a
     3.31 MB 189 kbps source.  Brightest of the three (>15 kHz at -38.3 dB);
     96k costs 1.9 dB there to save 0.6 MB, 112k measures no better than 96k
     (-1.87 vs -1.89 dB), so 128k again.
     v2.3.1583: frost gets frost.mp3 — 128 kbps, 2.05 MB for 2m15s off a
     3.06 MB 191 kbps source.  DARKEST of the four (>15 kHz at -47.3 dB), so
     this was the closest 96k call yet: it costs only 1.5 dB, on content
     already 47 dB down.  Still 128k — HF energy is a proxy that cannot see
     mid-range artifacts, and 0.5 MB is not worth guessing with.  Above 128k
     is measurement noise here (160k reads 0.1 dB WORSE), which is the ceiling
     of what this proxy can resolve, not a reason to prefer 128k over 160k.
     v2.3.1584: ember (the "fire zone", Flame Fields) gets fire.mp3 — 128 kbps,
     2.42 MB for 2m39s off a 3.73 MB 197 kbps source.  96k costs 2.5 dB above
     15 kHz, the worst of the four, so 128k is not a close call here.
     LONGEST track so far and therefore the heaviest resident: 53.4 MB decoded,
     against the 56 MB budget below.  It fits, but a track much past 2m40s
     would sit alone ABOVE the budget.  That is safe by construction rather
     than by luck — the just-decoded and currently-playing track are never
     evicted, so an oversized score stays resident and simply drops everything
     else (covered by the checks in the v2.3.1584 commit).  Do not "fix" it by
     raising ZONE_MUSIC_CACHE_MB: 56 is deliberately below two full tracks.
     v2.3.1585 / v2.3.1587: sky (the "desert zone", Wind Dunes) gets
     desert.mp3 — 128 kbps, 2.71 MB for 2m57s off a 4.35 MB 206 kbps source.
     v2.3.1587 swapped out v2.3.1585's first pick on the owner's call, at the
     same filename, so nothing else had to move.
     STILL THE ONE TRACK OVER THE BUDGET, though by far less than before:
     2m57s decodes to 59.7 MB against the 56 MB cap, where the track it
     replaced was 3m32s and 71.3 MB.  That is fine for the same reason it was
     fine then — the over-budget path is designed rather than accidental: an
     oversized track stays resident alone, evicts the others, and is itself
     freed on leaving the zone (verified against both tracks' real sizes).
     It is still the heaviest zone in the game for resident audio, so if the
     iPhone ever complains about the desert specifically, the lever is this
     track: MONO halves it (measured at 35.6 MB on the older, longer pick) and
     costs nothing in download — at 96k LAME's joint stereo already collapses
     so much that the mono file came out byte-for-byte the same size as the
     stereo one — or a shorter loop.  NOT a bigger budget.
     v2.3.1589: THIRD desert pick, owner-supplied, same filename again (the
     v2.3.1587 precedent — nothing else moves).  This one is the owner's own
     file shipped VERBATIM, which makes it the one track that breaks the
     encode convention above, deliberately and with no way around it here:
     3.72 MB, 2m33s, 194.7 kbps VBR, 48 kHz stereo.  No encoder exists in the
     build sandbox (no ffmpeg/lame/sox, and npm is blocked), so transcoding to
     the house 128 kbps / 44.1 kHz was not on the table; re-encoding a lossy
     source down would also have cost quality to save 1.0 MB.  Its ID3 tag is
     168 bytes with no album art, so there was no lossless trim either.
     Net effect, honestly: DOWNLOAD gets worse (3.72 MB vs 2.71 MB, +37% —
     the largest music file in the game), RESIDENT memory gets BETTER, because
     PCM cost is duration x rate x channels and this track is 24 s shorter.
     Careful about that second figure: decodeAudioData resamples to the
     AudioContext's OWN rate, not the file's, so the resident size is
     51.1 MiB on a 44.1 kHz context and 56.0 MiB on a 48 kHz one — against
     59.7 MB before.  On a 48 kHz device it therefore lands 24 KB OVER the
     56 MiB cap: still nominally the one over-budget track, but by 0.04%
     instead of 6.6%, and on a 44.1 kHz device it is comfortably inside for
     the first time.  The designed over-budget path (oversized track stays
     resident alone, evicts the rest, freed on leaving the zone) is unchanged
     and still what covers it.  If download size ever matters more than
     fidelity here, the lever is a 128 kbps / 44.1 kHz re-encode of the
     owner's source on a machine that has LAME — which would also put it
     firmly under the cap on every device.
     v2.3.1586: meadow gets forest.mp3 — 128 kbps, 1.90 MB for 2m05s off a
     2.98 MB 200 kbps source.  The clearest 128k call of the six: 96k costs
     3.3 dB above 15 kHz here, worse than any other track including
     login-theme's 3.0.  Shortest track so far and so the lightest resident at
     41.9 MB, comfortably inside the budget — a useful counterweight to the
     desert next door. */
  GLOBAL_MUSIC: '/audio/music/login-theme.mp3',
  GLOBAL_MUSIC_VOL: 0.22,
  /* v2.3.1582: the decoded-buffer cache is BUDGETED, not unbounded.
     An AudioBuffer is raw float32 PCM, so a 2 MB mp3 is ~50 MB of RAM.
     Measured in Chromium at 44.1 kHz stereo: login-theme 34.4 MB, village
     45.8 MB, world 49.5 MB.  Keeping every one forever was deliberate and
     free while ONE zone had a track; with a track in each of the 12 zones it
     is ~550 MB of PCM accumulating as the player tours the world — the same
     class of failure as the v2.3.1405 zone-art RAM problem, on the iPhone
     this game targets.  DOWNLOAD is not the concern (2 MB each); resident
     memory is.
     Re-decoding is the cheap side of the trade: the mp3 stays in the HTTP
     cache, so re-entry costs only a decode, hidden behind the zone-loading
     overlay and the 600 ms fade-in.  Evicting mid-fade is safe too — a
     playing AudioBufferSourceNode holds its own reference to the buffer, so
     dropping ours never cuts audio short.
     The budget is in MEGABYTES, not a track count, so it adapts to the art:
     at 56 MB one full-length track is always resident, while short loops (a
     1-minute track decodes to ~21 MB) keep two or three. */
  ZONE_MUSIC_CACHE_MB: 56,
  _bufBytes: function _bufBytes(buf) {
    return buf ? buf.length * (buf.numberOfChannels || 1) * 4 : 0;
  },
  _touchZoneMusic: function _touchZoneMusic(url) {
    if (!this._zoneMusicLru) this._zoneMusicLru = [];
    var at = this._zoneMusicLru.indexOf(url);
    if (at >= 0) this._zoneMusicLru.splice(at, 1);
    this._zoneMusicLru.unshift(url);
  },
  _rememberZoneMusic: function _rememberZoneMusic(url, buf) {
    if (!this._zoneMusicBuffers) this._zoneMusicBuffers = Object.create(null);
    this._zoneMusicBuffers[url] = buf;
    this._touchZoneMusic(url);
    var budget = this.ZONE_MUSIC_CACHE_MB * 1048576;
    var used = 0, i;
    for (i = 0; i < this._zoneMusicLru.length; i++) {
      used += this._bufBytes(this._zoneMusicBuffers[this._zoneMusicLru[i]]);
    }
    /* Drop from the cold end until inside budget.  Never the track just
       decoded, and never the one the room is currently playing. */
    for (i = this._zoneMusicLru.length - 1; i >= 0 && used > budget; i--) {
      var u = this._zoneMusicLru[i];
      if (u === url || u === this._zoneMusicUrl) continue;
      used -= this._bufBytes(this._zoneMusicBuffers[u]);
      delete this._zoneMusicBuffers[u];
      this._zoneMusicLru.splice(i, 1);
    }
  },
  init: function init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      /* v2.3.786: master bus.  Every voice used to connect straight to
         ctx.destination, so there was no way to shape overall volume --
         when iOS un-suspends the context (or the first gesture after a
         reload starts it), all pending voices slammed in at full level
         ("pops in loud").  All connects now route through _out(); fadeIn()
         ramps this gain on resume/unlock. */
      this._master = this.ctx.createGain();
      this._master.connect(this.ctx.destination);
    } catch (e) {}
  },
  /* Output node for every voice — falls back to destination if the master
     bus failed to build (behavior identical to pre-v2.3.786). */
  _out: function _out() {
    return this._master || this.ctx.destination;
  },
  /* Ramp the master bus from silent to full over `dur` seconds.  Called
     when the AudioContext (re)starts so queued/looping voices ease in
     instead of popping. */
  fadeIn: function fadeIn(dur) {
    if (!this.ctx || !this._master) return;
    try {
      var t = this.ctx.currentTime;
      var g = this._master.gain;
      g.cancelScheduledValues(t);
      g.setValueAtTime(0.001, t);
      g.exponentialRampToValueAtTime(1, t + (dur || 1.2));
    } catch (e) {}
  },
  beep: function beep(freq, dur, vol, type) {
    /* v2.3.1103: DISABLED. The owner removed all procedurally-synthesised
       audio ("worse than nothing"). beep() is the oscillator primitive behind
       every synth SFX (hit/collect/footstep/levelUp/status/etc.), so a single
       no-op here silences all of them at once while leaving the call sites and
       the real file-based SFX (SFX_MANIFEST / playFile) untouched. */
    return;
  },
  /* Play a one-shot audio file (mp3/ogg).  Caches an HTMLAudioElement
     per URL as a template, then clones for each play so multiple
     instances can overlap.  Honors this.muted.  Use for short SFX
     where canvas-tone synthesis isn't expressive enough. */
  _fileCache: {},
  playFile: function playFile(url, vol) {
    if (this.muted) return;
    try {
      var template = this._fileCache[url];
      if (!template) {
        template = new Audio(url);
        template.preload = 'auto';
        this._fileCache[url] = template;
      }
      var clone = template.cloneNode();
      clone.volume = vol == null ? 0.7 : vol;
      var p = clone.play();
      if (p && p.catch) p.catch(function () {});
    } catch (e) {}
  },
  /* §6 Material-varied hit sounds per archetype */hitSound: function hitSound(material) {
    if (!this.ctx || this.muted) return;
    try {
      var sounds = {
        slime: {
          freq: 150,
          type: 'sine',
          vol: 0.08
        },
        metal: {
          freq: 800,
          type: 'square',
          vol: 0.06
        },
        bone: {
          freq: 400,
          type: 'triangle',
          vol: 0.07
        },
        wood: {
          freq: 250,
          type: 'triangle',
          vol: 0.06
        },
        crystal: {
          freq: 1200,
          type: 'sine',
          vol: 0.05
        },
        flesh: {
          freq: 200,
          type: 'sawtooth',
          vol: 0.06
        },
        stone: {
          freq: 300,
          type: 'square',
          vol: 0.07
        }
      };
      var s = sounds[material] || sounds.flesh;
      this.beep(s.freq + Math.random() * 100, 0.06, s.vol, s.type);
    } catch (e) {}
  },
  collect: function collect() {
    var _this = this;
    this.beep(800, 0.08, 0.06, 'sine');
    setTimeout(function () {
      return _this.beep(1200, 0.06, 0.04, 'sine');
    }, 60);
  },
  deathBoom: function deathBoom(arch) {
    /* No-op for slimes (fodder).  The splat SFX is owned by the
       render-loop death-detection in BroTown.jsx, which fires exactly
       once per slime kill via the _slimeDeathStart guard.  Suppressing
       deathBoom here prevents the synth boom from layering on top
       (which is what the user kept hearing as the "old" sound). */
    if (arch === 'fodder') return;
    var _this2 = this;
    this.beep(80, 0.3, 0.12, 'sawtooth');
    setTimeout(function () {
      return _this2.beep(60, 0.4, 0.08, 'triangle');
    }, 100);
  },
  npcChat: function npcChat() {
    this.beep(600, 0.04, 0.03, 'sine');
  },
  footstep: function footstep(armored) {
    if (!this.ctx || this.muted) return;
    /* v2.3.1104: owner-supplied footstep. The source is a 25 s continuous
       walking clip, so we ISOLATE just the first step (offset 0 -> 0.22 s) and
       fire it once per jog cycle on foot-strike. `armored` (from equipped gear)
       only varies the feel: armoured a touch louder + lower-pitched, bare
       lighter + slightly up-pitched. Per-step vol/pitch jitter stops repeated
       steps from machine-gunning the same waveform. */
    /* v2.3.1422: footstep-v3 (owner: dirt footsteps, "replace the current
       one — keep cadence when sound plays").  Same per-jog-cycle trigger,
       same alternating left/right pair + vol/pitch jitter — only the
       SAMPLE changed.  The trimmed clip holds two clean steps at ~0.08s
       and ~0.92s (tools/trim_mp3.py window 8.60-10.30 of the source).
       Falls back to footstep-v2 while v3 is still loading. */
    var _fsKey = (this._samples && this._samples['footstep-v3']) ? 'footstep-v3'
               : (this._samples && this._samples['footstep-v2']) ? 'footstep-v2' : null;
    if (!_fsKey) return;
    if (this._footToggle === undefined) this._footToggle = 0;
    var two = (this._footToggle++ & 1);
    var off = _fsKey === 'footstep-v3' ? (two ? 0.92 : 0.08) : (two ? 0.57 : 0.0);
    var dur = _fsKey === 'footstep-v3' ? 0.34 : (two ? 0.18 : 0.22);
    /* v2.3.1237: owner feedback — footstep volume halved (armored
       0.34→0.17 base, bare 0.26→0.13; jitter halved in step). */
    if (armored) {
      this.play(_fsKey, { offset: off, duration: dur, vol: 0.17 + Math.random() * 0.03, rate: 0.96 + (Math.random() - 0.5) * 0.08 });
    } else {
      this.play(_fsKey, { offset: off, duration: dur, vol: 0.13 + Math.random() * 0.025, rate: 1.06 + (Math.random() - 0.5) * 0.10 });
    }
  },
  enterBuilding: function enterBuilding() {
    var _this3 = this;
    this.beep(400, 0.06, 0.05, 'sine');
    setTimeout(function () {
      return _this3.beep(500, 0.05, 0.04, 'sine');
    }, 80);
  },
  chatSend: function chatSend() {
    this.beep(500, 0.05, 0.04, 'sine');
  },
  chatReceive: function chatReceive() {
    this.beep(700, 0.04, 0.03, 'sine');
  },
  emote: function emote() {
    var _this4 = this;
    this.beep(600, 0.06, 0.04, 'sine');
    setTimeout(function () {
      return _this4.beep(800, 0.04, 0.03, 'sine');
    }, 60);
  },
  thwack: function thwack() {
    this.beep(250, 0.05, 0.08, 'sawtooth');
  },
  hitMaterial: function hitMaterial(archetype) {
    var mats = {
      fodder: 'slime',
      brute: 'stone',
      swarm: 'crystal',
      sentinel: 'metal',
      volatile: 'slime',
      stalker: 'flesh',
      hexer: 'crystal'
    };
    this.hitSound(mats[archetype] || 'flesh');
  },
  /* §6 Grand Slam — original sword-hit sample (shared across sword/magic/ranged
     grand slams) layered with the celebratory 6-note arpeggio. */grandSlam: function grandSlam() {
    var _this5 = this;
    if (!this.ctx || this.muted) return;
    this.play('sword-hit', { vol: 0.7 });
    var notes = [523, 659, 784, 1047, 1319, 1568];
    notes.forEach(function (f, i) {
      return setTimeout(function () {
        return _this5.beep(f, 0.15, 0.1 - i * 0.012, 'square');
      }, i * 60);
    });
    setTimeout(function () {
      _this5.beep(1047, 0.5, 0.08, 'sine');
      _this5.beep(1568, 0.5, 0.06, 'sine');
    }, 400);
  },
  /* §10 Collision sound — 3-layer audio event */collisionSound: function collisionSound(setupElement, triggerElement, manaRestored) {
    var _this6 = this;
    if (!this.ctx || this.muted) return;
    var consumeSounds = {
      burn: function burn() {
        return _this6.beep(200, 0.08, 0.06, 'sawtooth');
      },
      freeze: function freeze() {
        return _this6.beep(1000, 0.06, 0.04, 'sine');
      },
      poison: function poison() {
        return _this6.beep(150, 0.08, 0.05, 'square');
      },
      shock: function shock() {
        return _this6.beep(800, 0.04, 0.06, 'square');
      },
      root: function root() {
        return _this6.beep(180, 0.1, 0.05, 'triangle');
      },
      corrode: function corrode() {
        return _this6.beep(120, 0.1, 0.06, 'sawtooth');
      },
      daze: function daze() {
        return _this6.beep(500, 0.06, 0.04, 'sine');
      },
      fracture: function fracture() {
        return _this6.beep(250, 0.08, 0.06, 'square');
      },
      blind: function blind() {
        return _this6.beep(900, 0.05, 0.04, 'sine');
      }
    };
    var setupStatus = {
      flame: 'burn',
      frost: 'freeze',
      venom: 'poison',
      storm: 'shock',
      stone: 'root',
      water: 'corrode',
      wind: 'daze',
      dark: 'blind',
      light: 'fracture'
    }[setupElement];
    if (consumeSounds[setupStatus]) consumeSounds[setupStatus]();
    /* Layer 2: Collision burst — unique per element pair (using trigger pitch) */
    var triggerPitch = {
      flame: 300,
      frost: 500,
      water: 400,
      venom: 250,
      storm: 700,
      stone: 200,
      wind: 600,
      dark: 120,
      light: 900
    };
    setTimeout(function () {
      var freq = triggerPitch[triggerElement] || 400;
      _this6.beep(freq, 0.1, 0.15, 'sawtooth');
      _this6.beep(freq * 1.5, 0.08, 0.1, 'square');
    }, 100);
    /* Layer 3: Mana restore chime (pitch scales with amount) */
    if (manaRestored > 0) {
      setTimeout(function () {
        var pitch = 600 + Math.min(manaRestored * 8, 400);
        _this6.beep(pitch, 0.12, 0.08, 'sine');
        setTimeout(function () {
          return _this6.beep(pitch * 1.25, 0.1, 0.06, 'sine');
        }, 60);
      }, 200);
    }
  },
  /* §7 Level-up fanfare */levelUp: function levelUp() {
    var _this7 = this;
    if (!this.ctx || this.muted) return;
    /* Rising triumphant arpeggio */
    var notes = [262, 330, 392, 523, 659, 784, 1047];
    notes.forEach(function (freq, i) {
      setTimeout(function () {
        return _this7.beep(freq, 0.15, 0.12 - i * 0.01, 'square');
      }, i * 80);
    });
    /* Final sustained chord */
    setTimeout(function () {
      _this7.beep(523, 0.4, 0.08, 'sine');
      _this7.beep(659, 0.4, 0.06, 'sine');
      _this7.beep(784, 0.5, 0.06, 'sine');
    }, 600);
  },
  /* Whimsical death jingle */playerDeath: function playerDeath() {
    var _this8 = this;
    this.beep(400, 0.1, 0.12, 'square');
    setTimeout(function () {
      return _this8.beep(350, 0.1, 0.1, 'square');
    }, 120);
    setTimeout(function () {
      return _this8.beep(300, 0.1, 0.08, 'square');
    }, 240);
    setTimeout(function () {
      return _this8.beep(200, 0.2, 0.1, 'triangle');
    }, 380);
    setTimeout(function () {
      return _this8.beep(100, 0.3, 0.08, 'sine');
    }, 500);
  },
  join: function join() {
    var _this9 = this;
    /* Welcome jingle */
    this.beep(262, 0.12, 0.1, 'square');
    setTimeout(function () {
      return _this9.beep(330, 0.12, 0.08, 'square');
    }, 100);
    setTimeout(function () {
      return _this9.beep(392, 0.12, 0.08, 'square');
    }, 200);
    setTimeout(function () {
      return _this9.beep(523, 0.2, 0.1, 'square');
    }, 300);
  },
  bgNote: function bgNote(freq) {
    /* v2.3.1103: DISABLED with the rest of the procedural synth (see beep). */
    return;
  }
}, "_ambientOsc", null), "_ambientGain", null), "_ambientLfo", null), "_currentZoneAmbient", null), "_ambientOsc2", null), "_ambientGain2", null), "_ambientLfo2", null), "startZoneAmbient", function startZoneAmbient(zoneId) {
  if (!this.ctx || this.muted) return;
  if (this._currentZoneAmbient === zoneId) return;
  this._currentZoneAmbient = zoneId;
  /* Crossfade music between zones: fade the previous track to 0 over
     ~600 ms and let stopAmbient schedule its source.stop after the
     ramp.  Procedural drones (osc + LFO) still hard-stop -- they're
     low-volume and a fade adds little. */
  this.stopAmbient(true);
  /* Zone music — Web Audio path (NOT HTMLAudio). Fetch + decode the
     MP3 once, cache the AudioBuffer, then play through the same
     AudioContext as the oscillators. This sidesteps the HTMLAudio
     autoplay block (the AudioContext is already unlocked by the
     game's first-tap handler — same unlock the oscillator drone
     uses). When a zone has a track in ZONE_MUSIC, it REPLACES the
     procedural drone so the two layers don't fight. */
  var trackUrl = this.ZONE_MUSIC && this.ZONE_MUSIC[zoneId];
  /* v2.3.1581: hand over between the session track and a zone track.  Decided
     BEFORE the fetch below so the duck rides the same 600 ms as the crossfade
     rather than waiting on a download. */
  this.duckGlobalMusic(!!trackUrl);
  if (trackUrl) {
    var self = this;
    self._zoneMusicUrl = trackUrl;
    var startWithBuffer = function (buf) {
      /* Bail if the user changed zones during the fetch — the
         _zoneMusicUrl != trackUrl guard makes the stale promise a
         no-op without leaking a source node. */
      if (self._zoneMusicUrl !== trackUrl) return;
      try {
        if (self.ctx.state === 'suspended') self.ctx.resume();
        var src = self.ctx.createBufferSource();
        var gain = self.ctx.createGain();
        src.buffer = buf;
        src.loop = true;
        /* Fade in from 0 to 0.275 over 600 ms.  Pairs with the
           600 ms fade-out scheduled by stopAmbient(true) for a
           soft crossfade across zone boundaries. */
        var TARGET_VOL = 0.275; /* halved 0.55 → 0.275 so zone music sits as ambient under SFX */
        var t0 = self.ctx.currentTime;
        gain.gain.setValueAtTime(0, t0);
        gain.gain.linearRampToValueAtTime(TARGET_VOL, t0 + 0.6);
        src.connect(gain);
        gain.connect(self._out());
        src.start(0);
        self._zoneMusicSource = src;
        self._zoneMusicGain = gain;
      } catch (e) {}
    };
    if (self._zoneMusicBuffers && self._zoneMusicBuffers[trackUrl]) {
      self._touchZoneMusic(trackUrl);   /* a cache HIT is a use — keep it warm */
      startWithBuffer(self._zoneMusicBuffers[trackUrl]);
    } else {
      try {
        fetch(trackUrl)
          .then(function (r) { return r.ok ? r.arrayBuffer() : Promise.reject(new Error('http ' + r.status)); })
          .then(function (ab) { return self.ctx.decodeAudioData(ab); })
          .then(function (buf) {
            self._rememberZoneMusic(trackUrl, buf);
            startWithBuffer(buf);
          })
          .catch(function () { /* fetch / decode failure — silent */ });
      } catch (e) {}
    }
    return;
  }
  /* v2.3.1103: procedural oscillator DRONE disabled — the owner removed all
     synthesised audio ("worse than nothing"). When ZONE_MUSIC has a real track
     (above) it still plays; with none, the zone is simply silent instead of
     droning. setCombatIntensity() no-ops safely (it guards on _ambientGain). */
  return;
}), "stopAmbient", function stopAmbient(fadeMusic) {
  try {
    if (this._ambientOsc) {
      this._ambientOsc.stop();
      this._ambientOsc = null;
    }
    if (this._ambientLfo) {
      this._ambientLfo.stop();
      this._ambientLfo = null;
    }
    this._ambientGain = null;
    if (this._ambientOsc2) {
      this._ambientOsc2.stop();
      this._ambientOsc2 = null;
    }
    if (this._ambientLfo2) {
      this._ambientLfo2.stop();
      this._ambientLfo2 = null;
    }
    this._ambientGain2 = null;
    /* Zone music — stop the Web Audio source + drop refs so the
       buffer source can be GC'd. The decoded AudioBuffer cache
       (_zoneMusicBuffers) is kept across zone hops so re-entering a
       zone doesn't re-decode — within the MB budget enforced by
       _rememberZoneMusic (v2.3.1582; it used to be unbounded).

       When fadeMusic is true, ramp the existing gain to 0 over
       600 ms and let the source play on until just past the ramp
       end; the audio engine keeps the routed graph alive past the
       _zoneMusicSource ref drop because the local src/gain closure
       still holds them.  Used for the zone-transition crossfade. */
    if (this._zoneMusicSource) {
      var src = this._zoneMusicSource;
      if (fadeMusic && this._zoneMusicGain && this.ctx) {
        try {
          var oldGain = this._zoneMusicGain;
          var now = this.ctx.currentTime;
          oldGain.gain.cancelScheduledValues(now);
          oldGain.gain.setValueAtTime(oldGain.gain.value, now);
          oldGain.gain.linearRampToValueAtTime(0, now + 0.6);
          src.stop(now + 0.65);
        } catch (e) {
          try { src.stop(); } catch (_) {}
        }
      } else {
        try { src.stop(); } catch (e) {}
      }
      this._zoneMusicSource = null;
    }
    this._zoneMusicGain = null;
    this._zoneMusicUrl = null;
  } catch (e) {}
}), "setCombatIntensity", function setCombatIntensity(inCombat) {
  if (!this._ambientGain || !this.ctx) return;
  try {
    this._ambientGain.gain.setTargetAtTime(inCombat ? 0.018 : 0.008, this.ctx.currentTime, 0.5);
    if (this._ambientGain2) this._ambientGain2.gain.setTargetAtTime(inCombat ? 0.008 : 0.004, this.ctx.currentTime, 0.5);
  } catch (e) {}
});

/* ─── Sample-based SFX (real audio files) ──────────────────────────────────
   Loaded on demand from /sfx/<group>/<name>.m4a (AAC; re-encoded from the
   original uncompressed .wav by the compress-media workflow to shrink the
   download — decodeAudioData on iOS Safari decodes AAC natively). Playback is gated by the
   audio context unlocking (mobile/Safari require a user gesture before any
   audio plays). BT_AUDIO.unlock() should be called from the first touch /
   click and is idempotent. */
BT_AUDIO._samples = {};
BT_AUDIO._sampleLoading = {};
BT_AUDIO._unlocked = false;
BT_AUDIO._loadedManifest = false;
BT_AUDIO.SFX_MANIFEST = {
  /* v2.3.836: real footstep SFX isolated from the owner's videos --
     naked (softer thud) vs armored (metallic clank); chosen per-step
     from the player's equipped gear in visualSystems.js. */
  /* v2.3.1104: owner-supplied footstep. The source clip is 25 s of continuous
     walking; footstep() isolates just the FIRST step (offset 0, dur ~0.22 s)
     and fires it once per jog cycle on foot-strike. Used for both armoured and
     bare (footstep() varies vol/pitch between them). */
  'footstep-v2':      '/sfx/footstep/footstep-v2.mp3',
  /* v2.3.1422: owner sound pack — all four frame-trimmed to their useful
     seconds by tools/trim_mp3.py (lossless MP3 frame cut; the 60s source
     uploads shrank 4.6MB -> ~350KB total).
     footstep-v3: dirt footsteps, REPLACES footstep-v2 in footstep() —
       two clean steps at ~0.08s and ~0.92s; the per-jog-cycle cadence
       caller is untouched (owner: "keep cadence when sound plays").
     mine-strike: two pickaxe-on-stone hits (~0.08s / ~0.60s), fired at
       the gesture-tool's surface-contact moment, alternated.
     pan-sizzle: 6s frying loop while a cooking extraction is active.
     fish-reel: 5s steady reel loop while the fishing crank is turning. */
  'footstep-v3':      '/sfx/footstep/footstep-v3.mp3',
  'mine-strike':      '/sfx/mining/mine-strike.mp3',
  'pan-sizzle':       '/sfx/cooking/pan-sizzle.mp3',
  'fish-reel':        '/sfx/fishing/fish-reel.mp3',
  /* v2.3.1427 (owner sounds, round 2):
     axe-chop: two hatchet strikes (offsets ~0.08 / ~1.10) played when
       the axe marker hits the trunk, mine-strike alternation pattern.
     river-water: 6s flowing-water loop under the whole fishing
       attempt (pan-sizzle pattern). */
  'axe-chop':         '/sfx/woodcutting/axe-chop.mp3',
  'river-water':      '/sfx/fishing/river-water.mp3',
  /* v2.3.1429 (owner sounds, round 3):
     catch-splash: 1.6s water splash when the fish is caught (pairs
       with the breach-and-fly bag animation).
     cook-success: 0.7s sizzle sting when the cook completes. */
  'catch-splash':     '/sfx/fishing/catch-splash.mp3',
  'cook-success':     '/sfx/cooking/cook-success.mp3',
  'sword-swing':   '/sfx/sword/sword-swing.m4a',
  /* v2.3.254: wood-tier sword (the bamboo stick) gets its own swing
     SFX -- airier whoosh sourced from the user-uploaded mov. */
  'bamboo-swing':  '/sfx/sword/bamboo-swing.m4a',
  'sword-hit':     '/sfx/sword/sword-hit.m4a',   /* reserved for grand-slam hits only */
  'sword-hit2':    '/sfx/sword/sword-hit2.m4a', /* regular hit alternation */
  'sword-hit3':    '/sfx/sword/sword-hit3.m4a',  /* regular hit alternation */
  'bow-pullback':  '/sfx/bow/bow-pullback.m4a',
  'arrow-fly':     '/sfx/bow/arrow-fly.m4a',
  'arrow-hit':     '/sfx/bow/arrow-hit.m4a',
  'magic-cast':    '/sfx/magic/magic-cast.m4a',
  'magic-hit':     '/sfx/magic/magic-hit.m4a',
  'magic-hit2':    '/sfx/magic/magic-hit2.m4a',
  'monster-death': '/sfx/monster/Monster death-bony.m4a',
  'slime-projectile-hit': '/sfx/monster/slime-projectile-hit.m4a',
  'monster-hit':   '/sfx/monster/monster-hit.m4a',
  /* v2.3.1104: owner-supplied metallic CLANG for when a monster strikes the
     hero while WEARING ARMOUR. Two variants alternated by monsterHitHero() for
     variety; leading silence trimmed via offset so the hit lands immediately. */
  'armor-hit-1':   '/sfx/monster/armor-hit-1.mp3',
  'armor-hit-2':   '/sfx/monster/armor-hit-2.mp3',
  'shield-block':  '/sfx/shield/shield-block.m4a?v=2',
  'fishing-lure-drop':   '/sfx/fishing/lure-drop.m4a',
  'fishing-fish-on-hook': '/sfx/fishing/fish-on-hook.m4a',
  'fishing-reeling':     '/sfx/fishing/reeling.m4a',
  /* Slime death splat — routed through Web Audio so it plays without
     hitting the per-element HTMLAudio autoplay policy that was
     blocking new Audio().play() in the render loop. */
  'slime-death':   '/audio/slime-death-v2.mp3',
  'snowman-death': '/audio/snowman-death.mp3',
  /* Bones-crumble SFX -- extracted from the skeleton death source
     video (ed421fd9...) and trimmed to 1.2 s (peak + 0.3 s fade
     out) so it matches deathMs and doesn't trail past the bone-
     pile settle.  Plays via BT_AUDIO.monsterDeath. */
  'skeleton-death': '/audio/skeleton-death.mp3?v=2',
  'snowman-hit':   '/sfx/monster/snowman-hit.m4a?v=3',
  /* v2.3.849: timber crash for a felled tree (woodcutting success) — the
     "great" cut-down sound; wired into the extraction reward in
     lifeSkillRewards.js. */
  'tree-fall':     '/audio/tree-fall.mp3',
};

/* Regular sword-hit alternation. The two samples cycle so a flurry of hits
   doesn't hammer the same waveform. The original `sword-hit` sample is
   reserved for grand-slam hits per BT_AUDIO.grandSlam(). */
BT_AUDIO._swordHitToggle = 0;
BT_AUDIO.swordHit = function (opts) {
  var key = (this._swordHitToggle++ & 1) ? 'sword-hit3' : 'sword-hit2';
  this.play(key, opts);
};
/* Magic-hit alternation — same pattern as sword. Cycles magic-hit and
   magic-hit2 so staff-projectile hits don't repeat the same waveform. */
BT_AUDIO._magicHitToggle = 0;
BT_AUDIO.magicHit = function (opts) {
  var key = (this._magicHitToggle++ & 1) ? 'magic-hit2' : 'magic-hit';
  this.play(key, opts);
};
/* v2.3.1104: monster-strikes-hero SFX. When the hero is wearing armour, play
   one of two owner-supplied metallic CLANGs, alternating for variety (and
   trimming each file's leading silence via offset so the hit lands instantly).
   With no armour — or before the metal samples have preloaded — fall back to
   the generic 'monster-hit'. */
BT_AUDIO._armorHitToggle = 0;
/* v2.3.1108: fallbackKey lets ranged hits keep their own splat when unarmoured
   (e.g. 'slime-projectile-hit') while still clanging when armoured. Defaults to
   the melee 'monster-hit'. */
BT_AUDIO.monsterHitHero = function (armored, opts, fallbackKey) {
  if (armored && this._samples && (this._samples['armor-hit-1'] || this._samples['armor-hit-2'])) {
    var two = (this._armorHitToggle++ & 1);
    var key = two ? 'armor-hit-2' : 'armor-hit-1';
    var off = two ? 0.06 : 0.12; /* trim each clip's leading silence */
    var o = opts ? Object.assign({}, opts) : {};
    o.offset = off;
    this.play(key, o);
  } else {
    this.play(fallbackKey || 'monster-hit', opts);
  }
};
BT_AUDIO.monsterDeath = function (arch, opts) {
  /* No-op for slimes (fodder).  The splat SFX is owned by the render-
     loop death-detection in BroTown.jsx — playing the bony-death wav
     here too was layering the "old death sound" on top of the splat. */
  if (arch === 'fodder') return;
  if (arch === 'snowman') {
    /* v2.3.1129: the snow-explosion sample has a ~0.13 s quiet lead-in before
       the bang (measured: global_gain jumps to peak at frame 5).  Trim it via
       offset so the explosion lands the instant the snowman dies. */
    this.play('snowman-death', opts || { vol: 0.65, offset: 0.13 });
    return;
  }
  if (arch === 'skeleton') {
    /* Use the SFX bundled with the skeleton death video.  Mummy
       (pre-transform kills) and other archetypes still fall through
       to the generic monster-death. */
    this.play('skeleton-death', opts || { vol: 0.75 });
    return;
  }
  this.play('monster-death', opts || { vol: 0.5 });
};
BT_AUDIO.loadSample = function (key, url) {
  if (!this.ctx || this._samples[key] || this._sampleLoading[key]) return;
  this._sampleLoading[key] = true;
  fetch(url)
    .then(function (r) { return r.arrayBuffer(); })
    .then(function (buf) {
      return new Promise(function (resolve, reject) {
        BT_AUDIO.ctx.decodeAudioData(buf, resolve, reject);
      });
    })
    .then(function (audioBuf) {
      BT_AUDIO._samples[key] = audioBuf;
      delete BT_AUDIO._sampleLoading[key];
    })
    .catch(function () {
      delete BT_AUDIO._sampleLoading[key];
    });
};
BT_AUDIO.loadSfxManifest = function () {
  if (this._loadedManifest || !this.ctx) return;
  this._loadedManifest = true;
  var m = this.SFX_MANIFEST;
  for (var k in m) this.loadSample(k, m[k]);
};
/* v2.3.1422: managed looping SFX (sizzle while cooking, reel while
   cranking).  Keyed + idempotent: callers ENSURE the loop every frame
   and stop it when their condition lapses, so lifecycle bugs can't
   leave a loop orphaned longer than one condition check.  Missing
   sample -> kicks loadSample and no-ops (the next ensure starts it). */
BT_AUDIO.startSfxLoop = function (key, vol) {
  if (this.muted || !this.ctx) return;
  if (!this._sfxLoops) this._sfxLoops = {};
  if (this._sfxLoops[key]) return;             /* already running */
  var buf = this._samples[key];
  if (!buf) { var url = this.SFX_MANIFEST[key]; if (url) this.loadSample(key, url); return; }
  try {
    var src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    var g = this.ctx.createGain();
    g.gain.value = vol != null ? vol : 0.4;
    src.connect(g);
    g.connect(this._out());
    src.start(0);
    this._sfxLoops[key] = { src: src, gain: g };
  } catch (e) {}
};
BT_AUDIO.stopSfxLoop = function (key) {
  var l = this._sfxLoops && this._sfxLoops[key];
  if (!l) return;
  delete this._sfxLoops[key];
  try {
    /* short fade so the loop doesn't click off */
    var now = this.ctx.currentTime;
    l.gain.gain.setValueAtTime(l.gain.gain.value, now);
    l.gain.gain.linearRampToValueAtTime(0, now + 0.12);
    l.src.stop(now + 0.15);
  } catch (e) { try { l.src.stop(); } catch (_) {} }
};
/* v2.3.1577: start the session track, once.  Idempotent by design — it is
   called from the first-gesture unlock AND from the background-resume path,
   and a second call while one is already playing (or still fetching) must be
   a no-op rather than a second overlapping copy of the song.

   Fetched through the same decodeAudioData path as the zone tracks, for the
   same reason the zone tracks use it: HTMLAudio has its own autoplay gate
   that the AudioContext unlock does not satisfy (see the _zoneMusicSource
   note above — `new Audio()` silently failed there while the oscillators
   played fine). */
BT_AUDIO.startGlobalMusic = function () {
  var url = this.GLOBAL_MUSIC;
  if (!url || !this.ctx) return;
  if (this._globalMusicSource || this._globalMusicStarting) return;
  var self = this;
  var play = function (buf) {
    /* Re-check: the fetch is async and a background-resume may have started
       a source while it was in flight. */
    if (self._globalMusicSource || !self.ctx) return;
    try {
      if (self.ctx.state === 'suspended') self.ctx.resume();
      var src = self.ctx.createBufferSource();
      var gain = self.ctx.createGain();
      src.buffer = buf;
      src.loop = true;
      var t0 = self.ctx.currentTime;
      /* v2.3.1581: start DUCKED if a zone track already owns the music.  This
         path also runs on background-resume, so without the check a resume
         while standing in town would fade the session track up over the top
         of the town track. */
      var startVol = (self._zoneMusicSource || self._globalMusicDucked) ? 0 : self.GLOBAL_MUSIC_VOL;
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(startVol, t0 + 1.2);
      src.connect(gain);
      gain.connect(self._out());
      /* If iOS kills the source while backgrounded, drop the ref so
         resumeFromBackground can start a fresh one. */
      src.onended = function () {
        if (self._globalMusicSource === src) { self._globalMusicSource = null; self._globalMusicGain = null; }
      };
      src.start(0);
      self._globalMusicSource = src;
      self._globalMusicGain = gain;
    } catch (e) {}
  };
  if (this._globalMusicBuffer) return play(this._globalMusicBuffer);
  this._globalMusicStarting = true;
  try {
    fetch(url).then(function (r) { return r.arrayBuffer(); })
      .then(function (ab) { return self.ctx.decodeAudioData(ab); })
      .then(function (buf) { self._globalMusicBuffer = buf; self._globalMusicStarting = false; play(buf); })
      .catch(function () { self._globalMusicStarting = false; /* no music beats a broken boot */ });
  } catch (e) { this._globalMusicStarting = false; }
};

/* v2.3.1581: duck the session track under a zone track.
 *
 * GLOBAL_MUSIC is deliberately outside stopAmbient's reach (that is what lets
 * it survive zone changes), so the moment a zone gained a track of its own the
 * two would have played SIMULTANEOUSLY.  This is the reconciliation.
 *
 * Ducking, not stopping: the buffer source keeps running at zero gain and
 * keeps its POSITION, so leaving town returns to the session track where it
 * would have been rather than restarting it from the top — which is the whole
 * property v2.3.1577 exists to provide.  600 ms to match the zone crossfade
 * ramp on both sides, so the handover reads as one gesture. */
BT_AUDIO.duckGlobalMusic = function (down) {
  var g = this._globalMusicGain;
  if (!g || !this.ctx) return;
  var target = down ? 0 : this.GLOBAL_MUSIC_VOL;
  try {
    var now = this.ctx.currentTime;
    g.gain.cancelScheduledValues(now);
    g.gain.setValueAtTime(g.gain.value, now);
    g.gain.linearRampToValueAtTime(target, now + 0.6);
  } catch (e) {}
  this._globalMusicDucked = !!down;
};

BT_AUDIO.unlock = function () {
  if (!this.ctx) this.init();
  if (!this.ctx) return;
  /* v2.3.786: first unlock of a page load = the context is starting from
     scratch (fresh boot or post-exit reload).  Ease the master bus in so
     the ambient/zone music doesn't pop in loud on the first gesture. */
  var firstUnlock = !this._unlocked;
  if (this.ctx.state === 'suspended' && this.ctx.resume) {
    try { this.ctx.resume(); } catch (e) {}
  }
  this._unlocked = true;
  if (firstUnlock) this.fadeIn(1.2);
  this.loadSfxManifest();
  /* v2.3.1577: the session track starts here — this is the first gesture on
     the LOGIN screen (GameApp registers the handler at app level), so the
     music is playing before the player ever enters the world, and nothing
     restarts it on the way in. */
  this.startGlobalMusic();
};
/* v2.3.254: called from the visibilitychange handler in GameApp.jsx
   when the tab returns to foreground.  ctx.resume() alone is not
   enough on iOS Safari -- long backgrounding can implicitly stop
   the zone-music BufferSource, and resume() doesn't restart it.
   Re-kick the music for the zone we were last in. */
BT_AUDIO.resumeFromBackground = function () {
  if (!this.ctx) return;
  if (this.ctx.state === 'suspended' && this.ctx.resume) {
    try { this.ctx.resume(); } catch (e) {}
    /* v2.3.786: ease back in after a background resume (same pop as the
       first-gesture case, just mid-session). */
    this.fadeIn(0.8);
  }
  /* v2.3.1577: iOS can implicitly stop a BufferSource during a long
     backgrounding, and ctx.resume() does not restart it — the same reason
     the zone track is re-kicked below.  onended clears the ref, so this
     starts a fresh one only when the old one really died. */
  this.startGlobalMusic();
  var zone = this._currentZoneAmbient;
  if (!zone) return;
  /* startZoneAmbient early-returns when _currentZoneAmbient already
     matches the requested zone; clear the flag so it actually
     re-runs and gets us a fresh BufferSource. */
  this._currentZoneAmbient = null;
  try { this.startZoneAmbient(zone); } catch (e) {}
};
BT_AUDIO.play = function (key, opts) {
  if (this.muted || !this.ctx) return null;
  /* v2.3.130: iOS Safari suspends the AudioContext on tab-switch,
     phone call, screen lock, and sometimes spuriously after memory
     pressure.  unlock() resumes the ctx once on the first gesture,
     but if it suspends mid-session every subsequent createBufferSource
     call produces no sound — matching a user report that combat SFX
     "pop in then go silent".  Resume defensively here so any single
     play() call self-heals.  Also log once per resume-cycle to the
     in-game debug overlay so we can confirm this is the cause in
     the field. */
  if (this.ctx.state === 'suspended') {
    if (this.ctx.resume) { try { this.ctx.resume(); } catch (e) {} }
    /* v2.3.786: same anti-pop ease as unlock/resumeFromBackground —
       short ramp so the self-heal path doesn't blast either. */
    this.fadeIn(0.6);
    if (!this._suspendLogged && typeof window !== 'undefined' && window.debug && window.debug.pushLog) {
      try { window.debug.pushLog('warn', ['BT_AUDIO ctx was suspended (key=' + key + '); resuming']); } catch (e) {}
      this._suspendLogged = true;
    }
  } else if (this.ctx.state === 'running') {
    /* Reset the once-per-cycle guard so we'd log again if the ctx
       gets suspended a second time. */
    this._suspendLogged = false;
  }
  var buf = this._samples[key];
  if (!buf) {
    // Lazily load on first miss so a sound is at least cached for next time.
    var url = this.SFX_MANIFEST[key];
    if (url) this.loadSample(key, url);
    return null;
  }
  try {
    var src = this.ctx.createBufferSource();
    src.buffer = buf;
    var rate = (opts && opts.rate) ||
      (1 + (Math.random() - 0.5) * (opts && opts.pitchVar != null ? opts.pitchVar : 0.06));
    src.playbackRate.value = rate;
    var g = this.ctx.createGain();
    g.gain.value = (opts && opts.vol != null) ? opts.vol : 0.6;
    src.connect(g);
    g.connect(this._out());
    /* v2.3.1104: optional offset/duration so a sound can be ISOLATED to a
       slice of its file at runtime (no re-encoding needed) -- e.g. play just
       the first footstep out of a 25 s walking clip, or trim the leading
       silence off a hit sample. Web Audio start(when, offset, duration). */
    var _off = (opts && opts.offset) || 0;
    var _dur = (opts && opts.duration != null) ? opts.duration : null;
    if (_dur != null) src.start(0, _off, _dur);
    else if (_off) src.start(0, _off);
    else src.start(0);
    /* Return a handle so callers that need to cut a sample short
       (e.g. fishing reel sound when the catch completes mid-clip)
       can stop playback early. Most callers ignore the return value. */
    return { src: src, gain: g };
  } catch (e) {}
  return null;
};

export const BT_ACHIEVEMENTS = [{
  id: 'first_steps',
  name: 'First Steps',
  icon: '👟',
  desc: 'Walk 500 tiles',
  check: function check(s) {
    return s.steps >= 500;
  }
}, {
  id: 'explorer',
  name: 'Explorer',
  icon: '🧭',
  desc: 'Visit every building',
  check: function check(s) {
    return s.buildingsVisited >= 8;
  }
}, {
  id: 'chatterbox',
  name: 'Chatterbox',
  icon: '💬',
  desc: 'Send 20 messages',
  check: function check(s) {
    return s.msgsSent >= 20;
  }
}, {
  id: 'treasure1',
  name: 'Treasure Hunter',
  icon: '💎',
  desc: 'Find 5 collectibles',
  check: function check(s) {
    return s.totalCollected >= 5;
  }
}, {
  id: 'treasure2',
  name: 'Master Collector',
  icon: '👑',
  desc: 'Find all 10 in one day',
  check: function check(s) {
    return s.dailyCollected >= 10;
  }
}, {
  id: 'social',
  name: 'Social Butterfly',
  icon: '🦋',
  desc: 'Use 10 emotes',
  check: function check(s) {
    return s.emotesUsed >= 10;
  }
}, {
  id: 'regular',
  name: 'Regular',
  icon: '🏠',
  desc: 'Visit Bro Town 5 days',
  check: function check(s) {
    return s.daysVisited >= 5;
  }
}, {
  id: 'speed',
  name: 'Speed Walker',
  icon: '⚡',
  desc: 'Walk 2000 tiles',
  check: function check(s) {
    return s.steps >= 2000;
  }
}, {
  id: 'marathon',
  name: 'Marathon Bro',
  icon: '🏃',
  desc: 'Walk 10000 tiles',
  check: function check(s) {
    return s.steps >= 10000;
  }
}, {
  id: 'celebrity',
  name: 'Celebrity',
  icon: '⭐',
  desc: 'Get inspected 5 times',
  check: function check(s) {
    return s.timesInspected >= 5;
  }
}, /* §GUILD + §ARENA + §DIVE achievements (inlined from NEW_ACHIEVEMENTS) */
{
  id: 'guild_first',
  name: 'Guild Member',
  icon: '🏛️',
  desc: 'Join your first life skill guild',
  check: function check(s) {
    return s._guildRanksEarned >= 1;
  }
}, {
  id: 'guild_master',
  name: 'Guild Master',
  icon: '👑',
  desc: 'Reach Master rank in any guild',
  check: function check(s) {
    return s._guildMasterCount >= 1;
  }
}, {
  id: 'guild_all',
  name: 'Renaissance',
  icon: '🎭',
  desc: 'Reach Journeyman in all 10 guilds',
  check: function check(s) {
    return s._guildJourneymanAll;
  }
}, {
  id: 'arena_enter',
  name: 'Gladiator Hopeful',
  icon: '🏟️',
  desc: 'Enter the arena',
  check: function check(s) {
    return s._arenaEntered >= 1;
  }
}, {
  id: 'arena_win3',
  name: 'Arena Victor',
  icon: '⚔️',
  desc: 'Win 3 arena matches',
  check: function check(s) {
    return s._arenaWins >= 3;
  }
}, {
  id: 'arena_champion',
  name: 'Champion',
  icon: '🏆',
  desc: 'Win a gladiator tournament',
  check: function check(s) {
    return s._arenaChampion >= 1;
  }
}, {
  id: 'bet_first',
  name: 'High Roller',
  icon: '🎲',
  desc: 'Place your first arena bet',
  check: function check(s) {
    return s._betsMade >= 1;
  }
}, {
  id: 'bet_win5',
  name: 'Lucky Streak',
  icon: '🍀',
  desc: 'Win 5 arena bets',
  check: function check(s) {
    return s._betsWon >= 5;
  }
}, {
  id: 'dive_first',
  name: 'Deep Breath',
  icon: '🫧',
  desc: 'Dive underwater for the first time',
  check: function check(s) {
    return s._diveCount >= 1;
  }
}, {
  id: 'dive_treasure',
  name: 'Sunken Treasure',
  icon: '🏴‍☠️',
  desc: 'Find underwater treasure',
  check: function check(s) {
    return s._diveTreasures >= 1;
  }
}, {
  id: 'pet_evolve',
  name: 'Metamorphosis',
  icon: '🧬',
  desc: 'Evolve a pet',
  check: function check(s) {
    return s._petsEvolved >= 1;
  }
}, {
  id: 'pet_mythic',
  name: 'Mythic Tamer',
  icon: '🌟',
  desc: 'Create a Mythic pet',
  check: function check(s) {
    return s._mythicPets >= 1;
  }
}, {
  id: 'furniture_first',
  name: 'Interior Designer',
  icon: '🪑',
  desc: 'Craft your first furniture',
  check: function check(s) {
    return s._furnitureCrafted >= 1;
  }
}, {
  id: 'furniture_all',
  name: 'Dream Home',
  icon: '🏠',
  desc: 'Craft all 12 furniture pieces',
  check: function check(s) {
    return s._furnitureCrafted >= 12;
  }
}, {
  id: 'mkt_first',
  name: 'Trader',
  icon: '🏪',
  desc: 'Complete a marketplace trade',
  check: function check(s) {
    return s._mktTrades >= 1;
  }
}, {
  id: 'dungeon_create',
  name: 'Architect',
  icon: '🏗️',
  desc: 'Create a custom dungeon',
  check: function check(s) {
    return s._dungeonsCreated >= 1;
  }
}, {
  id: 'dungeon_play',
  name: 'Dungeon Master',
  icon: '🐉',
  desc: 'Clear 5 custom dungeons',
  check: function check(s) {
    return s._customDungeonsCleared >= 5;
  }
}, {
  id: 'war_first',
  name: 'Warmonger',
  icon: '⚔️',
  desc: 'Participate in a clan war',
  check: function check(s) {
    return s._warsParticipated >= 1;
  }
}, {
  id: 'war_mvp',
  name: 'War Hero',
  icon: '🌟',
  desc: 'Earn MVP in a clan war',
  check: function check(s) {
    return s._warMvps >= 1;
  }
}, {
  id: 'lv50',
  name: 'Half Century',
  icon: '⭐',
  desc: 'Reach combat level 50',
  check: function check(s) {
    return s._combatLevel >= 50;
  }
}, {
  id: 'lv100',
  name: 'Centurion',
  icon: '💯',
  desc: 'Reach combat level 100',
  check: function check(s) {
    return s._combatLevel >= 100;
  }
}, {
  id: 'lv200',
  name: 'Prestige',
  icon: '✦',
  desc: 'Reach combat level 200',
  check: function check(s) {
    return s._combatLevel >= 200;
  }
}];

/* NPC_DATA emptied -- placeholder NPCs (Mayor Bro / Trader Tix /
   Enchantress / Scout / Blacksmith Bron / Healer Luna / Beastmaster Kai /
   Veteran Ash / The Ferryman) removed per user request.  Rendering,
   quest, dialog, and follow code intact -- add entries back here one at
   a time to light each NPC up.  v2.3.788: the ferryman-portal code and
   the wasteland zone it led to were removed for good (owner decision,
   2026-06-12) -- don't re-add The Ferryman without rebuilding both. */
export const NPC_DATA = [];
