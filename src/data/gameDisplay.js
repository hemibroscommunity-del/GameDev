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
    /* "fire zone" = Flame Fields, and the "lava zone" too — gameDisplay.js:916
       describes it as lava rivers cutting through scorched earth.
       v2.3.1591: ?v= added because this file's CONTENT was replaced (owner
       swapped the score), which is precisely the case the v2.3.1589 note below
       says to bump for — the first time an entry's bytes change under a stable
       filename.  Without it a returning player keeps the old track out of their
       HTTP cache forever, since public/ is copied verbatim by vite rather than
       content-hashed. */
    ember: '/audio/music/fire.mp3?v=2.3.1591',
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
  /* ═══ v2.3.1738: PER-ZONE AMBIENCE (owner art) ═══
     Owner: "use this to play as the 'wind' ambient sound effect to play in a
     loop while in the zone" — Wind Dunes, which is zone id `sky` (zones.js
     names it Wind Dunes; the note above records that the repo also calls it
     "the desert zone").

     A LAYER on top of ZONE_MUSIC, not an entry in it: `sky` already has the
     desert score, and one slot per zone means putting wind here would have
     silenced that.  Read by startZoneAmbient, which starts the loop on entry
     and stops it on exit.

     NOT in SFX_MANIFEST, deliberately — loadSfxManifest fetches that whole
     map eagerly at unlock, so a 900KB ambience would land on every player
     in every zone.  These load on entry to the zone that uses them.
     The full 28.8s is kept rather than trimmed: it loops, and a short loop
     of wind is far more noticeable as a loop than a long one. */
  ZONE_AMBIENT: {
    sky: '/audio/ambient/wind-dunes.mp3',
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
     v2.3.1584 / v2.3.1591: ember (the "fire zone" / "lava zone", Flame Fields)
     gets fire.mp3 — 128 kbps, 2.35 MB for 2m34s off a 3.66 MB 199 kbps source.
     v2.3.1591 replaced v2.3.1584's score on the owner's call, at the same
     filename plus a ?v= bump (see the entry itself for why).
     96k costs 3.5 dB above 15 kHz on this one — the widest 96k-vs-128k gap of
     any track in the set, wider even than meadow's 3.3 — so 128k is not close.
     Resident cost 51.7 MB against the 56 MB budget below, slightly lighter than
     the 53.4 MB score it replaces.  It fits, but note how little headroom that
     leaves: a track much past 2m40s sits alone ABOVE the budget, as sky's does.
     That is safe by construction rather than by luck — the just-decoded and
     currently-playing track are never evicted, so an oversized score stays
     resident and simply drops everything else (covered by the checks in the
     v2.3.1584 and v2.3.1585 commits).  Do not "fix" it by raising
     ZONE_MUSIC_CACHE_MB: 56 is deliberately below two full tracks.
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
  /* v2.3.1590 (owner: "make the music play 75% quieter") — BOTH music
     volumes cut to a quarter, together, so the session track and the zone
     tracks keep their existing relationship to each other and to SFX:
       GLOBAL_MUSIC_VOL  0.22  -> 0.055
       ZONE_MUSIC_VOL    0.275 -> 0.06875
     Note this is a 75% cut in GAIN, which is about -12 dB.  Perceived
     loudness is not linear with gain — the rough rule is that -10 dB reads
     as "half as loud" — so this lands a little past half, not at a quarter,
     of the apparent volume.  If the owner wants it to SOUND 75% quieter,
     that is roughly -20 dB, i.e. another factor of ~2.5 on both numbers.
     SFX are deliberately untouched: the ask was the music. */
  GLOBAL_MUSIC_VOL: 0.055,
  /* v2.3.1590: was a bare `var TARGET_VOL` inside startZoneAmbient, which
     made the one number the owner actually tunes invisible next to its
     sibling above.  Promoted to a real constant; startZoneAmbient reads it. */
  ZONE_MUSIC_VOL: 0.06875,
  /* v2.3.1738: the per-zone AMBIENCE layer (ZONE_AMBIENT below).  Sits just
     under the zone score, because it plays UNDERNEATH it rather than instead
     of it — wind you notice but do not listen to. */
  ZONE_AMBIENT_VOL: 0.05,
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
  /* ═══ v2.3.1594: THE THIRD AUDIOCONTEXT STATE ═══════════════════════════
     iOS Safari has a WebKit-only state, 'interrupted', that a context enters
     on a phone call, a backgrounding, or another app taking the audio
     session.  It is NOT 'suspended', and it produces no sound.
     Every resume check in this file (and the tap-retry in GameApp.jsx) used
     to test `state === 'suspended'` exactly, so on iOS an interrupted context
     was invisible: nothing resumed it, nothing rebuilt the dead sources, and
     the tap-to-recover path never fired because it too asked for 'suspended'.
     Result: SFX AND music silent until a reload — the owner reported it twice,
     and the v2.3.1593 fix missed it because that fix's own gate was
     `=== 'suspended'` as well.
     Treat anything that is not 'running' as needing a wake.  That covers
     'suspended', 'interrupted', 'closed' (harmless no-op) and whatever WebKit
     adds next — the safe default is to try, since resume() on a healthy
     context is free. */
  _ctxLive: function _ctxLive() {
    return !!this.ctx && this.ctx.state === 'running';
  },
  /* Returns true if a wake was attempted. resume() rejects outside a user
     gesture on iOS (v2.3.780) — swallow it, the tap retry will come again. */
  _wakeCtx: function _wakeCtx() {
    if (!this.ctx || this.ctx.state === 'running' || !this.ctx.resume) return false;
    try {
      var p = this.ctx.resume();
      if (p && p.catch) p.catch(function () {});
    } catch (e) {}
    return true;
  },
  /* Run cb once the context is genuinely running.  Anything that schedules
     against ctx.currentTime MUST go through here: while the context is
     suspended or interrupted that clock is FROZEN, so a ramp scheduled then
     is pinned to a timestamp that may already be in the past when audio
     comes back — which is how the master bus got stuck near zero. */
  _whenRunning: function _whenRunning(cb) {
    if (!this.ctx) return;
    if (this.ctx.state === 'running') { cb(); return; }
    var self = this;
    var onState = function () {
      if (!self.ctx || self.ctx.state !== 'running') return;
      try { self.ctx.removeEventListener('statechange', onState); } catch (e) {}
      cb();
    };
    try { self.ctx.addEventListener('statechange', onState); } catch (e) { cb(); }
  },
  /* Ramp the master bus from silent to full over `dur` seconds.  Called
     when the AudioContext (re)starts so queued/looping voices ease in
     instead of popping. */
  fadeIn: function fadeIn(dur) {
    if (!this.ctx || !this._master) return;
    var self = this;
    /* v2.3.1594: deferred until actually running — see _whenRunning. */
    this._whenRunning(function () {
      try {
        var t = self.ctx.currentTime;
        var g = self._master.gain;
        g.cancelScheduledValues(t);
        g.setValueAtTime(0.001, t);
        g.exponentialRampToValueAtTime(1, t + (dur || 1.2));
        self._fadeUntil = t + (dur || 1.2);
      } catch (e) {}
    });
  },
  /* v2.3.1594: last-resort self-heal for the master bus.  fadeIn is the only
     thing that writes it, and a fade interrupted by a state change used to be
     able to strand it at 0.001 with no path back — silent game, reload the
     only cure.  Cheap enough to call from the SFX path: it no-ops unless the
     context is live, the bus is genuinely down, and no fade is in flight. */
  /* ═══ v2.3.1596: STOP GUESSING, LISTEN ═══════════════════════════════════
     Every fix from v2.3.1593 to v2.3.1595 was event-driven: catch
     visibilitychange / pageshow / a tap, decide from ctx.state what iOS did to
     us, act.  The owner's report killed that approach outright —

       "if you quickly return to the tab the music and audio won't work, but
        if you wait at least 30 seconds it'll resume upon touch"

     — because on a QUICK return iOS does not suspend the context at all.  It
     stays 'running' with its output detached: the sources are dead, but every
     state check says healthy, and the tap handler is gated on
     `state !== 'running'` so touching deliberately did nothing.  Only after
     ~30s does iOS actually suspend, which is the one case all that machinery
     could see.  No amount of state-reading fixes the quick case, because the
     state is a lie.

     So: tap the master bus with an AnalyserNode and ask the only question that
     cannot lie — is sound actually coming out?  If music should be audible and
     the bus reads pure digital silence for several seconds running, the graph
     is dead whatever ctx.state claims, and we rebuild.

     An analyser is a pure tap (nothing connects to its output), fftSize 256,
     read once a second.  Negligible cost, and it converges instead of
     depending on catching exactly the right event at exactly the right moment
     — which is what has failed four times. */
  _ensureAnalyser: function _ensureAnalyser() {
    if (this._analyser || !this.ctx || !this._master) return this._analyser;
    try {
      var a = this.ctx.createAnalyser();
      a.fftSize = 256;
      this._master.connect(a);      /* tap only — no onward connection */
      this._analyser = a;
      this._analyserBuf = new Uint8Array(a.fftSize);
      /* v2.3.1602: PREFILL WITH THE SILENCE MIDPOINT.  A Uint8Array starts at
         ZERO, and an AnalyserNode with no output connected is not reliably
         pulled through the graph in WebKit — getByteTimeDomainData can leave
         the buffer untouched.  All-zero then failed the `!== 128` test on the
         very first sample, so _masterIsSilent answered "not silent" ALWAYS and
         the watchdog's rebuild branch could never fire.  Prefilled, an
         unwritten buffer reads as silence instead: the failure now points
         toward recovery rather than away from it. */
      this._analyserBuf.fill(128);
    } catch (e) {}
    return this._analyser;
  },
  /* True only for PROVABLE silence: every sample sitting exactly on the 128
     midpoint.  Real music never does that, so this cannot false-positive on
     a quiet passage. */
  _masterIsSilent: function _masterIsSilent() {
    var a = this._ensureAnalyser();
    if (!a || !this._analyserBuf) return false;
    /* v2.3.1601: a master bus mid-FADE is not evidence of a dead graph.
       fadeIn starts at 0.001, and getByteTimeDomainData is 8-bit — 0.001
       amplitude quantises to exactly 128, the same value true silence gives.
       So a perfectly healthy fade-in read as "provable silence", the watchdog
       rebuilt on it, and the rebuild called fadeIn again: a loop that could
       keep the game silent indefinitely.  Never judge during a fade. */
    try {
      if (this._fadeUntil && this.ctx && this.ctx.currentTime < this._fadeUntil) return false;
    } catch (e) {}
    try {
      a.getByteTimeDomainData(this._analyserBuf);
      for (var i = 0; i < this._analyserBuf.length; i++) {
        if (this._analyserBuf[i] !== 128) {
          /* v2.3.1602: proof the tap works.  Until we have seen ONE real
             non-midpoint sample we cannot distinguish "silent" from "this
             analyser is never pulled", so silence is not actionable evidence
             and _masterIsSilent stays false below. */
          this._analyserProven = true;
          return false;
        }
      }
      if (!this._analyserProven) return false;   /* unproven tap: no evidence */
      return true;
    } catch (e) { return false; }
  },
  /* One convergence step.  Safe to call as often as you like — every branch
     is idempotent, and it is also what a touch now runs (a tap is just an
     extra opportunity to converge, not a special code path). */
  /* v2.3.1600: REBUILD THE WHOLE GRAPH.  Every recovery up to here assumed the
     AudioContext could be woken.  After a LONG absence iOS does not suspend or
     interrupt it — it CLOSES it, and a closed context can never be resumed:
     resume() rejects for ever.  init() guards on `if (this.ctx) return`, so the
     dead context was kept for the life of the page and _wakeCtx retried it once
     a second until reload.  That is the owner's "after leaving and not
     returning for a while", and it is invisible to every state-based and
     output-based check before this, because the graph is not asleep or
     detached — it is gone.
     Decoded buffers belong to the context that decoded them, so the caches are
     dropped too and re-decode against the new one; the mp3s are still in the
     HTTP cache, so that costs a decode, not a download.  The fresh context
     starts suspended on iOS and needs a gesture, which the watchdog and the
     touch handler both already supply — the point is that recovery becomes
     POSSIBLE, where before it was not. */
  /* ═══ v2.3.1604: THE iOS AUDIO SESSION ════════════════════════════════════
     Owner, after leaving Safari for another app and returning: "the music
     wouldn't return even with touch input.  I saw the speaker icon near the
     browser url so it's like it thought something was playing but nothing was."

     That symptom is diagnostic.  The speaker icon means Safari believes the
     page is producing audio — so the context is RUNNING, the sources are alive,
     and the graph really is generating signal.  Nothing is asleep, closed, or
     missing.  The signal simply never reaches the speaker, because switching to
     another app hands the iOS AUDIO SESSION to that app, and returning does not
     hand it back.

     Every detector built so far is blind to this by construction:
       - ctx.state says 'running', because it is;
       - the analyser taps the MASTER BUS, which is upstream of the
         destination, so it sees the signal and reports healthy audio;
       - the sources exist, so the missing-source branches never fire.
     The graph is perfect.  The output path is not part of the graph.

     The only thing that has ever re-claimed the session in this codebase is the
     silent-WAV HTMLAudio play in GameApp's unlock() — and that is one-shot per
     page load (`done = true`), so it has never run a second time.  Playing an
     HTMLAudioElement re-asserts the audio session category; a fresh
     AudioContext then re-negotiates its route to the hardware.  Both must
     happen inside a user gesture, which is why this is armed on visibility and
     fired on the next touch rather than attempted on the visibilitychange
     itself, where iOS would refuse it. */
  SILENT_WAV: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=',
  /* Re-assert the audio session category.  Cheap, silent, and safe to repeat. */
  _reclaimSession: function _reclaimSession() {
    try {
      var a = new Audio(this.SILENT_WAV);
      a.setAttribute('playsinline', '');
      a.setAttribute('webkit-playsinline', '');
      var pr = a.play();
      if (pr && pr.catch) pr.catch(function () {});
    } catch (e) {}
  },
  noteHidden: function noteHidden() { this._hiddenAt = Date.now(); },
  /* Arm a reclaim if we were away long enough for another app to have taken the
     session.  A flick between tabs comes back in well under 2s and keeps its
     session, so it stays on the cheap path and is not disturbed. */
  noteVisible: function noteVisible() {
    var away = this._hiddenAt ? (Date.now() - this._hiddenAt) : 0;
    this._hiddenAt = 0;
    if (away >= 2000) this._needsSessionReclaim = true;
  },
  /* Called from the touch handler.  A gesture is the only moment iOS honours
     either half of this. */
  reclaimIfNeeded: function reclaimIfNeeded() {
    if (!this._needsSessionReclaim) return false;
    this._needsSessionReclaim = false;
    this._reclaimSession();
    /* A context whose route to the hardware was taken away cannot be repaired
       in place — build a new one, which re-negotiates it.  Cheap enough: the
       mp3s stay in the HTTP cache, so this costs decodes, not downloads. */
    try { this._rebuildContext(); } catch (e) {}
    try { this._rebuildSources(); } catch (e) {}
    return true;
  },
  _rebuildContext: function _rebuildContext() {
    var old = this.ctx;
    this.ctx = null;
    this._master = null;
    this._analyser = null;
    this._analyserBuf = null;
    this._fadeUntil = 0;
    this._globalMusicSource = null;
    this._globalMusicGain = null;
    this._globalMusicStarting = false;
    this._globalMusicBuffer = null;      /* decoded against the dead context */
    this._zoneMusicSource = null;
    this._zoneMusicGain = null;
    this._zoneMusicUrl = null;
    this._zoneMusicStarting = false;
    this._zoneMusicBuffers = Object.create(null);
    this._zoneMusicLru = [];
    this._samples = {};
    this._sampleLoading = {};
    this._sfxLoops = {};
    this._loadedManifest = false;
    this._unlocked = false;
    this._silentTicks = 0;
    this._asleepTicks = 0;
    try { if (old && old.close && old.state !== 'closed') old.close(); } catch (e) {}
    try { this.init(); } catch (e) {}
    if (this.ctx) {
      this._wakeCtx();
      try { this.loadSfxManifest(); } catch (e) {}
    }
  },
  _audioHealthCheck: function _audioHealthCheck() {
    if (!this.ctx || this.muted) return;
    /* v2.3.1600: closed is terminal — rebuild rather than retry for ever. */
    if (this.ctx.state === 'closed') { this._rebuildContext(); return; }
    /* Never fight iOS while we are actually backgrounded — resuming there is
       refused anyway and would just burn the retry. */
    if (typeof document !== 'undefined' && document.hidden) { this._silentTicks = 0; return; }
    if (!this._ctxLive()) {
      this._wakeCtx();            /* refused outside a gesture? try again next tick */
      this._silentTicks = 0;
      /* v2.3.1600: escalation.  A context that will not wake after 30 straight
         seconds of trying, while the page is VISIBLE (hidden pages returned
         above), is not going to — WebKit can leave one wedged in a state it
         never reports as 'closed'.  Rebuild rather than retry the same dead
         object until the player reloads.  30s is deliberately long: iOS
         legitimately refuses resume() outside a user gesture, and a player
         who is simply looking at the screen without touching must not trigger
         a rebuild loop. */
      this._asleepTicks = (this._asleepTicks || 0) + 1;
      if (this._asleepTicks >= 30) { this._asleepTicks = 0; this._rebuildContext(); }
      return;
    }
    this._asleepTicks = 0;
    this._ensureAudible();
    var z = this._currentZoneAmbient;
    var zoneWants = !!(z && this.ZONE_MUSIC && this.ZONE_MUSIC[z]);
    if (!zoneWants && !this.GLOBAL_MUSIC) { this._silentTicks = 0; return; }
    /* Missing sources need no listening — just start them. */
    /* v2.3.1599: EXPIRE STALE IN-FLIGHT FLAGS before trusting them.
       The v2.3.1597 guards are cleared only when their fetch promise settles —
       and a promise on a page iOS has frozen may never settle at all: the
       request dies at the network layer without rejecting, and queued
       microtasks can be discarded outright.  A tab backgrounded mid-download
       therefore left the flag stuck true, and BOTH restart branches below are
       gated on it, so the watchdog went quiet permanently and only a reload
       brought audio back.  Intermittent by nature — it depends on whether a
       fetch happened to be in flight when the tab was switched away, which is
       exactly why it survived three clean tab-switch tests and then failed.
       A real fetch+decode of a 2-3 MB track completes in 1-3s, so anything
       still "in flight" after 8s is not coming back.  Clearing it merely lets
       the next tick retry; the anti-stacking property is untouched. */
    var _now = Date.now();
    if (this._zoneMusicStarting && this._zoneMusicStartingAt
        && (_now - this._zoneMusicStartingAt) > 8000) {
      this._zoneMusicStarting = false;
    }
    if (this._globalMusicStarting && this._globalMusicStartingAt
        && (_now - this._globalMusicStartingAt) > 8000) {
      this._globalMusicStarting = false;
    }
    if (this.GLOBAL_MUSIC && !this._globalMusicSource && !this._globalMusicStarting) {
      this.startGlobalMusic();
    }
    /* v2.3.1597: _zoneMusicStarting is the whole reason this does not stack.
       A zone fetch takes a second or two, during which _zoneMusicSource is
       legitimately null — without the guard this branch fires every tick and
       every pending start eventually plays. */
    if (zoneWants && !this._zoneMusicSource && !this._zoneMusicStarting) {
      this._currentZoneAmbient = null;
      try { this.startZoneAmbient(z); } catch (e) {}
    }
    /* Sources present but nothing coming out = the quick-return case. */
    if (this._masterIsSilent()) {
      this._silentTicks = (this._silentTicks || 0) + 1;
      if (this._silentTicks >= 3) {         /* ~3s of provable silence */
        this._silentTicks = 0;
        this._teardownGlobalMusic();
        this.startGlobalMusic();
        if (zoneWants) {
          this._currentZoneAmbient = null;
          try { this.startZoneAmbient(z); } catch (e) {}
        }
      }
    } else {
      this._silentTicks = 0;
    }
  },
  startAudioWatchdog: function startAudioWatchdog() {
    if (this._watchdogTimer || typeof setInterval !== 'function') return;
    var self = this;
    this._watchdogTimer = setInterval(function () {
      try { self._audioHealthCheck(); } catch (e) {}
    }, 1000);
  },
  _ensureAudible: function _ensureAudible() {
    if (!this._ctxLive() || !this._master) return;
    try {
      var t = this.ctx.currentTime;
      if (this._fadeUntil && t < this._fadeUntil) return;   /* fade in flight */
      var g = this._master.gain;
      if (g.value >= 0.999) return;
      g.cancelScheduledValues(t);
      g.setValueAtTime(Math.max(0.001, g.value), t);
      g.exponentialRampToValueAtTime(1, t + 0.25);
      this._fadeUntil = t + 0.25;
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
  /* ═══ v2.3.1738: PER-ZONE AMBIENT LOOP (owner: wind in Wind Dunes) ═══
     A LAYER, not a replacement: `sky` already has a ZONE_MUSIC score
     (desert.mp3) and the owner asked for wind "to play in a loop while in the
     zone", not for the music to go.  So this rides on top, at a low volume
     under both the score and the SFX.

     Deliberately NOT in SFX_MANIFEST.  loadSfxManifest() eagerly fetches
     EVERY entry in that map at unlock, so a 900KB ambience would be
     downloaded by every player of every zone — the exact cost the owner cut
     ~40MB of music to avoid.  Kept in its own table and loaded on ENTRY to
     the zone that uses it, the way ZONE_MUSIC already works.  startSfxLoop's
     own self-heal reads SFX_MANIFEST and finds nothing here, which is fine:
     it no-ops until our explicit loadSample resolves, and the next zone
     entry (or the ensure below) starts it.

     Hooked HERE rather than at the six startZoneAmbient call sites because
     this function is the choke point they all funnel through, and it already
     early-returns when the zone has not actually changed. */
  var _prevAmb = this._zoneAmbientKey;
  if (_prevAmb) { try { this.stopSfxLoop(_prevAmb); } catch (e) {} this._zoneAmbientKey = null; }
  var _ambUrl = this.ZONE_AMBIENT && this.ZONE_AMBIENT[zoneId];
  if (_ambUrl) {
    var _ambKey = 'zoneamb-' + zoneId;
    this._zoneAmbientKey = _ambKey;
    var _self0 = this;
    if (this._samples[_ambKey]) {
      this.startSfxLoop(_ambKey, this.ZONE_AMBIENT_VOL);
    } else {
      /* Fetch once, then start — but only if the player is STILL in this
         zone when it lands.  A long download plus a fast walk-through would
         otherwise strand a wind loop playing in the next zone. */
      Promise.resolve(this.loadSample(_ambKey, _ambUrl)).then(function () {
        if (_self0._zoneAmbientKey === _ambKey) _self0.startSfxLoop(_ambKey, _self0.ZONE_AMBIENT_VOL);
      }).catch(function () {});
    }
  }
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
    /* v2.3.1602: POSITION EPOCH for the zone track, mirroring the session
       track's since v2.3.1593.  This is what makes a rebuild inaudible: a
       restarted zone track picks up where it would have been instead of
       jumping to the top of the song.  Reset only when the TRACK changes, so
       entering a new zone still starts its music from the beginning.
       Wall-clock, because ctx.currentTime freezes while the page is asleep and
       the whole point is to survive that. */
    if (self._zoneMusicEpochUrl !== trackUrl) {
      self._zoneMusicEpochUrl = trackUrl;
      self._zoneMusicEpoch = Date.now();
    }
    var startWithBuffer = function (buf) {
      /* Bail if the user changed zones during the fetch — the
         _zoneMusicUrl != trackUrl guard makes the stale promise a
         no-op without leaking a source node.
         v2.3.1597: note what this guard does NOT catch — two starts for the
         SAME url.  It compares urls, so racing starts on one zone all pass. */
      if (self._zoneMusicUrl !== trackUrl) { self._zoneMusicStarting = false; return; }
      self._zoneMusicStarting = false;
      /* v2.3.1603: never build a source on a context that is not running.  A
         BufferSource created and started against a suspended or interrupted
         context is the unreliable case that leaves music "playing" inaudibly;
         _whenRunning defers to the statechange after the player's first touch,
         which is the moment iOS actually honours the wake.  The url re-check
         inside guards a zone change while we waited. */
      self._whenRunning(function () {
      if (self._zoneMusicUrl !== trackUrl) return;
      try {
        /* v2.3.1597: LAST-DITCH ANTI-STACK.  Whatever raced to get here, only
           one zone source may be audible: stop whatever is already playing
           before taking the slot.  Without this the previous source keeps
           running with nothing referencing it — unstoppable for the rest of
           the session, which is what "the town music played 3 times, staggered"
           actually was. */
        if (self._zoneMusicSource) {
          try { self._zoneMusicSource.stop(); } catch (e) {}
          self._zoneMusicSource = null;
          self._zoneMusicGain = null;
        }
        self._wakeCtx();   /* v2.3.1594: 'interrupted' counts too */
        var src = self.ctx.createBufferSource();
        var gain = self.ctx.createGain();
        src.buffer = buf;
        src.loop = true;
        /* Fade in from 0 to ZONE_MUSIC_VOL over 600 ms.  Pairs with the
           600 ms fade-out scheduled by stopAmbient(true) for a
           soft crossfade across zone boundaries.
           v2.3.1590: the literal 0.275 (itself halved from 0.55 so zone
           music sits as ambient under SFX) moved to the ZONE_MUSIC_VOL
           constant beside GLOBAL_MUSIC_VOL, and both were cut to a
           quarter on the owner's call. */
        var TARGET_VOL = self.ZONE_MUSIC_VOL;
        /* v2.3.1595: set the value DIRECTLY, then schedule the ramp only once
           the clock is moving.  This is the same frozen-clock fault v2.3.1594
           fixed in fadeIn — and missed here and in startGlobalMusic, which is
           why music still did not come back on tab-return.  A rebuild happens
           precisely when the context is suspended or interrupted, so
           ctx.currentTime is FROZEN: `setValueAtTime(0, t0)` pinned the gain at
           zero and the ramp to TARGET_VOL was scheduled against a timestamp
           that had already passed by the time audio resumed.  The source was
           genuinely playing — at volume zero. */
        gain.gain.value = 0;
        self._whenRunning(function () {
          try {
            var t0 = self.ctx.currentTime;
            gain.gain.cancelScheduledValues(t0);
            gain.gain.setValueAtTime(0, t0);
            gain.gain.linearRampToValueAtTime(TARGET_VOL, t0 + 0.6);
          } catch (e) { try { gain.gain.value = TARGET_VOL; } catch (_e) {} }
        });
        src.connect(gain);
        gain.connect(self._out());
        /* v2.3.1602: resume at position — see the epoch note above. */
        var zOff = 0;
        try {
          if (buf.duration > 0 && self._zoneMusicEpoch) {
            zOff = ((Date.now() - self._zoneMusicEpoch) / 1000) % buf.duration;
            if (!(zOff >= 0)) zOff = 0;
          }
        } catch (e) { zOff = 0; }
        src.start(0, zOff);
        self._zoneMusicSource = src;
        self._zoneMusicGain = gain;
      } catch (e) {}
      });
    };
    if (self._zoneMusicBuffers && self._zoneMusicBuffers[trackUrl]) {
      self._touchZoneMusic(trackUrl);   /* a cache HIT is a use — keep it warm */
      startWithBuffer(self._zoneMusicBuffers[trackUrl]);
    } else {
      /* v2.3.1597: mark the start IN FLIGHT.  A zone track is fetched and
         decoded asynchronously, so _zoneMusicSource stays null for a second or
         two after the start is requested.  Nothing minded until v2.3.1596 gave
         this a caller that fires every second: the watchdog saw a null source,
         concluded the music was missing, and requested another start — once per
         second for the whole download.  Every one of them then resolved and
         played, which is the owner's "town music played 3 times, staggered".
         Global music has had this guard (_globalMusicStarting) since v2.3.1577;
         zone music simply never had a caller impatient enough to need one. */
      self._zoneMusicStarting = true;
      self._zoneMusicStartingAt = Date.now();   /* v2.3.1599: staleness clock */
      try {
        fetch(trackUrl)
          .then(function (r) { return r.ok ? r.arrayBuffer() : Promise.reject(new Error('http ' + r.status)); })
          .then(function (ab) { return self.ctx.decodeAudioData(ab); })
          .then(function (buf) {
            self._rememberZoneMusic(trackUrl, buf);
            startWithBuffer(buf);        /* clears _zoneMusicStarting */
          })
          .catch(function () { self._zoneMusicStarting = false; /* fetch / decode failure — silent */ });
      } catch (e) { self._zoneMusicStarting = false; }
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
    /* v2.3.1597: cancel any pending start.  Nulling _zoneMusicUrl already makes
       an in-flight startWithBuffer bail (it compares urls), so the flag must
       clear with it or a zone change during a download would leave it stuck
       true and the watchdog would never start music again. */
    this._zoneMusicStarting = false;
  } catch (e) {}
}), "setCombatIntensity", function setCombatIntensity(inCombat) {
  if (!this._ambientGain || !this.ctx) return;
  try {
    this._ambientGain.gain.setTargetAtTime(inCombat ? 0.018 : 0.008, this.ctx.currentTime, 0.5);
    if (this._ambientGain2) this._ambientGain2.gain.setTargetAtTime(inCombat ? 0.008 : 0.004, this.ctx.currentTime, 0.5);
  } catch (e) {}
});

/* ─── Sample-based SFX (real audio files) ──────────────────────────────────
   Loaded on demand from /sfx/<group>/<name>.mp3, re-encoded from the original
   uncompressed .wav by the compress-media workflow to shrink the download.
   Playback is gated by the audio context unlocking (mobile/Safari require a
   user gesture before any audio plays). BT_AUDIO.unlock() should be called
   from the first touch / click and is idempotent.

   v2.3.1610: EVERY SFX IS mp3, AND MUST STAY mp3.  19 of these 30 entries
   shipped as .m4a (AAC).  decodeAudioData — the only path playFile uses — is
   the one place AAC is NOT universally supported: measured in a real Chromium
   against this very manifest, all 19 m4a entries threw EncodingError and all
   11 mp3 entries decoded.  A perfect split by container.  So on Chrome, Edge
   and every Android browser, each sword swing and hit, the bow, all magic,
   every monster hit and death, the shield block and the fishing set were
   SILENT — and no amount of testing on an iPhone could reveal it, because
   iOS Safari decodes AAC natively.  That asymmetry is exactly the trap
   v2.3.1578 hit for MUSIC (AAC won on quality-per-byte, then would not decode,
   so the track shipped as mp3); the sfx were never re-checked, so this is the
   same bug twice.
   The re-encode is 96 kbps CBR, chosen by measurement: on sword-swing (the
   sharpest transient in the set) it loses 0.45 dB above 12 kHz against the m4a
   source and lands at 6099 B versus the source's 6423 — SMALLER than what it
   replaces, so the fix costs no download.  If you ever add a sound here,
   ship it as mp3 and prove it with tools/qa/mp/audio-formats.mjs, which fails
   on any manifest entry a Chromium-class decoder refuses. */
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
  'sword-swing':   '/sfx/sword/sword-swing.mp3',
  /* ═══ v2.3.1798: OWNER SWING PACK — three, rotated ═══
     Owner: "these are sound effects I want to swap out for the sword swing
     instead (you can rotate between the 3).  The last one is special attack
     sound."
     'sword-swing' above is kept as the FALLBACK key rather than deleted:
     meleeSwingSfx() still returns it, swordSwing() maps it onto the rotation,
     and anything that plays the key directly keeps working.
     Each upload was frame-trimmed by tools/trim_mp3.py to the part that is
     actually the sound — swing-b had 1.08s of leading silence before its
     transient and a dead tail after it (60KB -> 11KB), swing-c 0.16s (16KB ->
     8KB).  110KB of upload became 50KB of game asset with no re-encode.
     mp3, per the v2.3.1610 rule above; proven by tools/qa/mp/audio-formats.mjs. */
  'sword-swing-1': '/sfx/sword/swing-a.mp3',
  'sword-swing-2': '/sfx/sword/swing-b.mp3',
  'sword-swing-3': '/sfx/sword/swing-c.mp3',
  /* The fourth upload, and the owner named its job: the special attack.  It
     replaces a three-beep synth arpeggio (see specialAttack in
     playerActions.js). */
  'special-swipe': '/sfx/sword/special-swipe.mp3',
  /* v2.3.254: wood-tier sword (the bamboo stick) gets its own swing
     SFX -- airier whoosh sourced from the user-uploaded mov. */
  'bamboo-swing':  '/sfx/sword/bamboo-swing.mp3',
  'sword-hit':     '/sfx/sword/sword-hit.mp3',   /* reserved for grand-slam hits only */
  'sword-hit2':    '/sfx/sword/sword-hit2.mp3', /* regular hit alternation */
  'sword-hit3':    '/sfx/sword/sword-hit3.mp3',  /* regular hit alternation */
  'bow-pullback':  '/sfx/bow/bow-pullback.mp3',
  'arrow-fly':     '/sfx/bow/arrow-fly.mp3',
  'arrow-hit':     '/sfx/bow/arrow-hit.mp3',
  'magic-cast':    '/sfx/magic/magic-cast.mp3',
  'magic-hit':     '/sfx/magic/magic-hit.mp3',
  'magic-hit2':    '/sfx/magic/magic-hit2.mp3',
  'monster-death': '/sfx/monster/Monster death-bony.mp3',
  'slime-projectile-hit': '/sfx/monster/slime-projectile-hit.mp3',
  'monster-hit':   '/sfx/monster/monster-hit.mp3',
  /* v2.3.1104: owner-supplied metallic CLANG for when a monster strikes the
     hero while WEARING ARMOUR. Two variants alternated by monsterHitHero() for
     variety; leading silence trimmed via offset so the hit lands immediately. */
  'armor-hit-1':   '/sfx/monster/armor-hit-1.mp3',
  'armor-hit-2':   '/sfx/monster/armor-hit-2.mp3',
  'shield-block':  '/sfx/shield/shield-block.mp3?v=2',
  /* v2.3.1737: owner-supplied shield IMPACT for Shield Bash (the ability),
     distinct from shield-block above (taking a hit on the shield).  The
     upload was 8.04s / 257KB but the impact itself is 0.38s — attack at
     0.02-0.10, body to 0.32, tail to ~0.55, then dead air.  Cut losslessly to
     0.72s with tools/trim_mp3.py (frame-boundary copy, no re-encode) for
     23KB.  mp3, per the v2.3.1610 rule above — proven by
     tools/qa/mp/audio-formats.mjs. */
  'shield-bash':   '/sfx/shield/shield-bash.mp3',
  /* v2.3.1738: owner-supplied wind-impact for Whirlwind.  Upload was 4.70s
     with the swell ending at 2.40s; cut losslessly to 2.62s (trim_mp3.py),
     150KB -> 82KB.  Long by SFX standards on purpose — the ability now pulls
     a whole screen of monsters in and holds them for a second, so the sound
     covers the gather rather than punctuating it. */
  'whirlwind':     '/sfx/magic/whirlwind.mp3',
  /* v2.3.1746: owner-supplied quest-completion fanfare (owner: "play this
     sound upon quest completion").  3.58s / 114KB, left uncut on purpose —
     it is a fanfare that resolves, not an impact to punctuate, so trimming
     it the way shield-bash was trimmed would cut off the resolution.  It
     outlasts the 2.2s banner, which is fine: the sound is the celebration,
     the banner is the label.  mp3, per the v2.3.1610 rule above. */
  'quest-complete': '/sfx/quest/quest-complete.mp3',
  'fishing-lure-drop':   '/sfx/fishing/lure-drop.mp3',
  'fishing-fish-on-hook': '/sfx/fishing/fish-on-hook.mp3',
  'fishing-reeling':     '/sfx/fishing/reeling.mp3',
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
  'snowman-hit':   '/sfx/monster/snowman-hit.mp3?v=3',
  /* v2.3.849: timber crash for a felled tree (woodcutting success) — the
     "great" cut-down sound; wired into the extraction reward in
     lifeSkillRewards.js. */
  'tree-fall':     '/audio/tree-fall.mp3',
};

/* Regular sword-hit alternation. The two samples cycle so a flurry of hits
   doesn't hammer the same waveform. The original `sword-hit` sample is
   reserved for grand-slam hits per BT_AUDIO.grandSlam(). */
/* ═══ v2.3.1798: THE SWING ROTATION, LEVEL-MATCHED ═══
   Same shape as swordHit/magicHit below — a counter on BT_AUDIO and one
   helper — because that is how this file already alternates a sample set.
   THE GAIN TABLE IS NOT DECORATION.  The three uploads are recorded at very
   different levels: peak RMS 0.274 / 0.391 / 0.129, a 3x spread.  (v2.3.1807
   dropped the third from the rotation on the owner's ear; the table keeps its
   measurement anyway.)  Rotated raw
   at one volume, every third swing would sound like it came from another room
   — a rotation exists to stop the ear noticing repetition, and an audible
   level step is MORE noticeable than the repetition it was meant to hide.
   The multipliers bring all three to the loudness of swing-1, which is the one
   the existing vol:0.55 call sites were tuned against.  Resulting peaks at
   that volume are 0.44 / 0.36 / 0.40 — no clipping headroom problem.
   (Measured with tools/audio_analyze.mjs, which decodes through a real
   Chromium; there is no ffmpeg in this sandbox to normalise the files
   themselves, so the correction lives at the gain node.) */
/* ═══ WHICH UPLOAD IS WHICH ═══ (v2.3.1810b — settled, so nobody redoes it)
     sword-swing-1  swing-a.mp3  freesound_gamestudioattackrelease*384909*
                                 20898 bytes, shipped untrimmed
     sword-swing-2  swing-b.mp3  u_xg7ssi08yrswordairswing24*37695*
                                 60186 -> 11703 (1.08s of leading silence cut)
     sword-swing-3  swing-c.mp3  musicholderswordsound*260274*
                                 16800 -> 8160 (0.16s cut)
     special-swipe               freesound_communityhitswingswordsmall*295566*
   Recovered from the upload byte sizes through the trim, because the source
   filenames do not survive into the repo and the owner refers to them by the
   digits at the end.

   ═══ v2.3.1807 -> v2.3.1810b: WHICH TWO ═══
   v2.3.1807 dropped sword-swing-3 on "I think it's the 3rd in the order I
   uploaded ... it sounds more like a hit".  The identification was right —
   the 3rd upload IS swing-c — but the guess about which sound they disliked
   was not, and the owner has now named the files outright: "Remove sound
   ending in 4909 for sword swing and only use alternating between sounds
   ending in 60274 and 37695."  So swing-1 comes out and swing-3 goes back in.
   A filename beats an ordinal; that is the whole lesson, and it is why the
   table above now exists.

   The KEYS and the FILES all stay (see SFX above).  Nothing fetches an
   unlisted key, so an idle entry costs nothing until something plays it, and
   the rotation is the whole switch.  Note the gain table still normalises to
   swing-1's loudness even though swing-1 no longer plays: that is deliberate,
   because the vol:0.55 call sites were tuned against it, so the pair keep both
   their match to each other AND their absolute level. */
BT_AUDIO.SWING_ROTATION = ['sword-swing-3', 'sword-swing-2'];
BT_AUDIO.SWING_GAIN = {
  'sword-swing-1': 1.00,   /* out of rotation since v2.3.1810b; kept as the reference the other two are normalised to */
  'sword-swing-2': 0.70,
  'sword-swing-3': 2.12,
};
BT_AUDIO._swingIdx = 0;
/* `key` is whatever meleeSwingSfx() decided.  Only the generic sword key is
   rotated: 'bamboo-swing' is the wood-tier stick's own airier whoosh
   (v2.3.254) and is a different weapon's sound, not a variant of this one. */
BT_AUDIO.swordSwing = function (key, opts) {
  var k = key;
  if (!k || k === 'sword-swing') {
    k = this.SWING_ROTATION[this._swingIdx++ % this.SWING_ROTATION.length];
  }
  var base = (opts && opts.vol != null) ? opts.vol : 0.6;
  var o = {};
  for (var q in opts) o[q] = opts[q];
  o.vol = base * (this.SWING_GAIN[k] || 1);
  return this.play(k, o);
};
/* v2.3.1798: the special's own sound.  Quietest of the four uploads by a wide
   margin (peak RMS 0.043 against the swings' 0.27), so it carries a large
   fixed boost rather than a table entry — it has one caller and one level. */
BT_AUDIO.specialSwipe = function (opts) {
  var base = (opts && opts.vol != null) ? opts.vol : 0.6;
  return this.play('special-swipe', { vol: base * 4.6, pitchVar: 0.04 });
};
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
/* v2.3.1738: RETURNS THE PROMISE.  Every existing caller ignores the return
   value, so this is additive — but a caller that needs to act WHEN the sample
   is ready (the per-zone ambient loop in startZoneAmbient) cannot poll for it,
   and wrapping the old undefined in Promise.resolve() resolves immediately,
   i.e. before the fetch has even started.  Resolves after decode; resolves
   (not rejects) on failure and on the already-loaded/in-flight early return,
   so `.then(start)` is always safe and a missing file degrades to silence. */
BT_AUDIO.loadSample = function (key, url) {
  if (!this.ctx || this._samples[key] || this._sampleLoading[key]) return Promise.resolve();
  this._sampleLoading[key] = true;
  return fetch(url)
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
    self._wakeCtx();
    /* v2.3.1603: same invariant as the zone track — only build on a live
       context.  Re-checked inside because the wait can be arbitrarily long. */
    self._whenRunning(function () {
      if (self._globalMusicSource || !self.ctx) return;
      try {
      var src = self.ctx.createBufferSource();
      var gain = self.ctx.createGain();
      src.buffer = buf;
      src.loop = true;
      /* v2.3.1581: start DUCKED if a zone track already owns the music.  This
         path also runs on background-resume, so without the check a resume
         while standing in town would fade the session track up over the top
         of the town track.
         v2.3.1593: ask the ZONE TABLE, not _zoneMusicSource.  On the resume
         path that ref can still point at the source iOS already killed, and
         once most zones had tracks it was also null for a beat mid-rebuild —
         either way the old test could answer "nobody owns the music" while
         standing in town and fade the session track up over the top. */
      var zoneOwnsMusic = !!(self.ZONE_MUSIC && self._currentZoneAmbient
        && self.ZONE_MUSIC[self._currentZoneAmbient]);
      var startVol = (zoneOwnsMusic || self._globalMusicDucked) ? 0 : self.GLOBAL_MUSIC_VOL;
      /* v2.3.1595: direct value + deferred ramp — see the zone-music note in
         startZoneAmbient.  Scheduling against the frozen clock left the
         session track running at gain zero after a tab-return. */
      gain.gain.value = 0;
      self._whenRunning(function () {
        try {
          var tr = self.ctx.currentTime;
          gain.gain.cancelScheduledValues(tr);
          gain.gain.setValueAtTime(0, tr);
          gain.gain.linearRampToValueAtTime(startVol, tr + 1.2);
        } catch (e) { try { gain.gain.value = startVol; } catch (_e) {} }
      });
      src.connect(gain);
      gain.connect(self._out());
      /* If iOS kills the source while backgrounded, drop the ref so
         resumeFromBackground can start a fresh one. */
      src.onended = function () {
        if (self._globalMusicSource === src) { self._globalMusicSource = null; self._globalMusicGain = null; }
      };
      /* v2.3.1593: resume at POSITION rather than from the top.  The session
         track's whole point is that it plays unbroken for the session, so a
         rebuild after a background must not restart the song — the epoch is
         wall-clock (Date.now), which keeps advancing while the AudioContext
         is suspended and ctx.currentTime does not. */
      if (!self._globalMusicEpoch) self._globalMusicEpoch = Date.now();
      var offset = 0;
      if (buf.duration > 0) {
        offset = ((Date.now() - self._globalMusicEpoch) / 1000) % buf.duration;
        if (!(offset >= 0)) offset = 0;          /* NaN guard */
      }
      src.start(0, offset);
      self._globalMusicSource = src;
      self._globalMusicGain = gain;
      } catch (e) {}
    });
  };
  if (this._globalMusicBuffer) return play(this._globalMusicBuffer);
  this._globalMusicStarting = true;
  this._globalMusicStartingAt = Date.now();     /* v2.3.1599: staleness clock */
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
  /* v2.3.1594: not-'running', so an iOS 'interrupted' context is woken by the
     first gesture like a suspended one.  unlock() runs inside a real user
     gesture, which is the ONE moment iOS reliably honours resume(). */
  this._wakeCtx();
  this._unlocked = true;
  if (firstUnlock) this.fadeIn(1.2);
  this.loadSfxManifest();
  /* v2.3.1577: the session track starts here — this is the first gesture on
     the LOGIN screen (GameApp registers the handler at app level), so the
     music is playing before the player ever enters the world, and nothing
     restarts it on the way in. */
  this.startGlobalMusic();
  /* v2.3.1596: from the first gesture on, converge once a second instead of
     trusting any single event to be delivered. */
  this.startAudioWatchdog();
};
/* v2.3.254: called from the visibilitychange handler in GameApp.jsx
   when the tab returns to foreground.  ctx.resume() alone is not
   enough on iOS Safari -- long backgrounding can implicitly stop
   the zone-music BufferSource, and resume() doesn't restart it.
   Re-kick the music for the zone we were last in. */
/* v2.3.1593: tear the session track down so startGlobalMusic will genuinely
   rebuild it.  Needed because the ONLY thing that cleared _globalMusicSource
   was src.onended, and iOS does not reliably fire it for a source it stopped
   during a backgrounding — the exact unreliability v2.3.254 already worked
   around for the zone track by clearing _currentZoneAmbient by hand.  Without
   this the stale ref made startGlobalMusic early-return forever and the
   session track never came back; _globalMusicGain went stale with it, so a
   later duckGlobalMusic(false) on leaving a scored zone ramped a dead node
   and the game stayed silent until reload.  ("Music doesn't work when I
   return to the game.") */
BT_AUDIO._teardownGlobalMusic = function () {
  var src = this._globalMusicSource;
  this._globalMusicSource = null;
  this._globalMusicGain = null;
  /* v2.3.1595: also clear the in-flight guard.  If the page froze mid-fetch
     that promise may never settle, leaving _globalMusicStarting true forever —
     and startGlobalMusic early-returns on it, so the session track could never
     be rebuilt again no matter how many times the player returned.  The buffer
     is cached separately, so a redundant refetch costs nothing. */
  this._globalMusicStarting = false;
  if (src) {
    /* Detach onended first: it would otherwise fire during stop() and null
       out the refs of whatever source has since replaced this one. */
    try { src.onended = null; } catch (e) {}
    try { src.stop(); } catch (e) {}
  }
};

/* `hard` = we know the page really went away and came back (visibilitychange
   / pageshow), as opposed to a bare window focus.
   v2.3.1594: needed because the ctx-state test is necessary but not
   sufficient — iOS can interrupt the audio session, kill our BufferSources,
   and have the context back at 'running' by the time visibilitychange fires.
   The state check then says "nothing happened" and the dead sources are never
   rebuilt.  A genuine hide/show cycle is the reliable signal; focus is not,
   which is why focus stays soft and cannot restart the zone song. */
BT_AUDIO.resumeFromBackground = function (hard) {
  if (!this.ctx) return;
  /* v2.3.1601: THE WATCHDOG IS THE ONLY REPAIRMAN NOW.
     This used to tear the audio down and rebuild it on every visibilitychange,
     because `hard` is true for all of them.  On a QUICK tab switch — where iOS
     did nothing at all and the audio was perfectly healthy — that meant
     dipping the master to 0.001 via fadeIn, stopping a working session track,
     and restarting a working zone track, purely on the assumption that
     something must have broken.  Nothing had.
     Worse, it could sustain itself: a master sitting at 0.001 reads as EXACTLY
     the silence midpoint through the analyser's 8-bit time-domain data, so the
     watchdog saw "provable silence", rebuilt, and called fadeIn again.
     So this no longer repairs anything.  It wakes the context — idempotent and
     safe — and runs one health check.  If audio is fine, nothing is touched.
     If it is genuinely dead, the watchdog notices within ~3s by LISTENING,
     which is the one method that does not have to guess what iOS did.
     `hard` now only distinguishes "the page really went away" for the fade;
     it no longer authorises destruction. */
  var wasAsleep = !this._ctxLive();
  if (wasAsleep) {
    this._wakeCtx();
    /* v2.3.786: ease back in after a real resume.  Only when the context was
       actually asleep — fading a healthy bus was half of the v2.3.1601 bug. */
    this.fadeIn(0.8);
  }
  /* v2.3.1602: a real hide/show cycle DOES rebuild the sources again — but for
     a different reason than v2.3.1594's version, and without its cost.
     v2.3.1601 removed that rebuild and left recovery entirely to the watchdog's
     silence detection, which turns out never to have fired: the analyser tap is
     not reliably pulled in WebKit, so it always answered "not silent" (see
     _ensureAnalyser).  The quick-switch recovery that worked at v2.3.1596 was
     the rebuild, not the listening — removing it removed the only thing working.
     What made the old rebuild painful was that it dipped the master and
     restarted the zone song from the top.  Neither happens now: the fade is
     gated on the context actually having been asleep, and BOTH tracks resume at
     position, so a rebuild the player did not need is inaudible rather than
     jarring.  That is what makes it safe to do unconditionally.
     `hard` is true only for visibilitychange and pageshow — a bare window focus
     still does nothing, so ordinary desktop clicking about costs nothing. */
  if (hard) {
    /* v2.3.1603: DEFER THE REBUILD UNTIL THE CONTEXT IS ACTUALLY RUNNING.
       On a quick switch iOS refuses resume() outside a user gesture, so this
       used to tear both tracks down and immediately build their replacements
       on a context that was still asleep — and a BufferSource created and
       started against a suspended context is exactly the unreliable case.  The
       old sources were gone, the new ones never sounded, and nothing rebuilt
       again until something else woke the context.
       _whenRunning fires immediately when the context is live and otherwise on
       the statechange that follows the player's first touch, so the rebuild now
       happens at the one moment it can succeed. */
    var self = this;
    this._whenRunning(function () { self._rebuildSources(); });
  }
  try { this._audioHealthCheck(); } catch (e) {}
};

/* v2.3.1603: the single rebuild-the-sources step, extracted so both the resume
   path and the watchdog use identical logic.  Assumes a running context —
   every caller goes through _whenRunning or checks _ctxLive first. */
BT_AUDIO._rebuildSources = function () {
  this._teardownGlobalMusic();
  var z = this._currentZoneAmbient;
  if (z && this.ZONE_MUSIC && this.ZONE_MUSIC[z]) {
    this._currentZoneAmbient = null;            /* defeat the same-zone early-return */
    try { this.startZoneAmbient(z); } catch (e) {}
  }
  try { this.startGlobalMusic(); } catch (e) {}
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
  /* v2.3.1594: not-'running' rather than =='suspended', so an iOS
     'interrupted' context self-heals here too — this is the highest-traffic
     recovery path in the game, and it was blind to the one state iOS actually
     uses.  The log now carries the real state, which is the evidence that
     would have pointed at 'interrupted' the first time. */
  if (!this._ctxLive()) {
    var _st = this.ctx.state;
    this._wakeCtx();
    /* v2.3.786: same anti-pop ease as unlock/resumeFromBackground —
       short ramp so the self-heal path doesn't blast either. */
    this.fadeIn(0.6);
    if (!this._suspendLogged && typeof window !== 'undefined' && window.debug && window.debug.pushLog) {
      try { window.debug.pushLog('warn', ['BT_AUDIO ctx was ' + _st + ' (key=' + key + '); resuming']); } catch (e) {}
      this._suspendLogged = true;
    }
  } else {
    /* Reset the once-per-cycle guard so we'd log again if the ctx
       gets suspended a second time. */
    this._suspendLogged = false;
    /* v2.3.1594: bus stuck low with no fade in flight — restore it. */
    this._ensureAudible();
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
/* v2.3.1669 (owner): Mayor Bro is back, one NPC, standing on the path at
   the foot of his own steps.  Position measured off the painted town art
   (/maps/town_v15.webp, stretched to 48x32 tiles = 1536 world px): the
   door arch sits at ~(757, 317) and the bottom of the staircase at
   ~(757, 410), so (758, 448) puts him on the path just clear of the
   steps.  The player spawns at the fountain (768, 768), 320 px south —
   he is on screen at spawn on a 390x844 phone, with the house behind
   him.
   pathRadius 0 pins him: a quest giver who wanders is a quest giver you
   have to hunt for.  `phrases` is REQUIRED — the AI loop indexes it
   unguarded and an empty array throws. */
export const NPC_DATA = [{
  id: 'mayor_bro',
  name: 'Mayor Bro',          /* MUST equal QUEST_CHAINS[].npc — getNpcQuest keys on it */
  /* v2.3.1672: real art (owner-supplied).  `sprite` wins over `avatar` in the
     renderer; the emoji stays as the fallback for the frames before the
     texture resolves and for any NPC that never gets art.
     The frame is normalised to the PLAYER's stand frame — 256x256, figure
     ~200px tall, feet on the same y=223 baseline — so he reads as a person
     standing in the street rather than a prop at some arbitrary size. */
  sprite: '/sprites/npc/mayor-bro.webp',
  /* v2.3.1673 (owner: "show his head in the dialogue window").  A head crop
     of the same sprite, so the portrait can never drift from the figure
     standing in the street.  Square and small (96px) because it renders as a
     chip beside the dialogue text, not a splash. */
  portrait: '/sprites/npc/mayor-bro-head.webp',
  avatar: '🧔',
  color: '#f5c542',
  /* v2.3.1794 (owner: "mayor bro right outside the house"): he followed his
     house up the stairs.  Beside the door rather than in front of it — the
     stair head is at x=960 and standing on it would make the one route onto
     the terrace a squeeze past him, now that NPCs block. */
  /* v2.3.1813: the re-fused town map (town_v17) is 52x55 tiles where v16 was
     96x30, so (1055, 300) now sits in the cliffs along the northern rim.
     Moved onto open cobble 245px north-north-east of TOWN_SPAWN (815, 1010),
     so he is on screen and straight ahead when the player lands — the job
     this position has always had.  Measured against the new art, not
     converted from the old number: every sample within a 44px disc of this
     point is open ground.
     He is deliberately KEPT while the town's buildings are switched off
     (worldProps.js, TOWN_PROPS_ENABLED).  He is the only NPC in the game and
     the entire Mayor Bro quest chain hangs off him, so removing him along
     with the scenery would silently delete onboarding rather than clear the
     map — a different thing from what "keep the buildings and NPCS removed"
     was asking for. */
  x: 900, y: 780,
  /* v2.3.1794: MOVED WITH HIM.  The wander step steers an NPC toward
     spawnX/spawnY (pathRadius 0 means exactly that point, with no roaming), so
     leaving this at the old plaza spot spawned him outside his new house and
     then walked him back down the stairs over the next few seconds.  Caught by
     mp-townmap reading him at (985.3, 563.7) — the old coordinates, with the
     fractional drift of something mid-walk. */
  spawnX: 900, spawnY: 780,   /* v2.3.1813: moves WITH x/y above — pathRadius 0 walks him to this exact point every frame, so leaving it behind drags him back to the old plaza */
  renderX: 900, renderY: 780,   /* v2.3.1813: kept in step with x/y — these are the FIRST-FRAME draw position, and they were stale even against the previous (1055,300), so he popped across the plaza on frame one */
  hp: 100, maxHp: 100,
  /* v2.3.1675 (owner: "remove his health bar he doesn't need one").  He is a
     quest giver in a safe town; a health bar over him reads as "fight this". */
  noHp: true,
  alive: true,
  respawnAt: 0,
  pathRadius: 0,
  moveTimer: 0,
  targetX: 900, targetY: 780,   /* v2.3.1813: likewise — the initial wander target, before the first steer overwrites it */
  chatTimer: 8000,
  chatBubble: null,
  phrases: [
    'Another one washes ashore.',
    "There's work, if you want it.",
    'Mind the Hollows.',
  ],
  canFollow: false,
  followZones: [],
  _facing: 'down',
  _questMarker: null,
  _hitThisSwing: false,
}, {
  /* ═══ v2.3.1773: THE BLACKSMITH, AT THE FOUNTAIN ═══
     Owner: "Add this npc to the game near the water fountain he'll be the
     blacksmith.  Size him about the same as mayor bro."

     POSITION.  Measured off the painted town art rather than guessed: the map
     (/maps/town_v15.webp) is 1254px stretched to the zone's 1536 world px, so
     world = art x 1.2249.  The fountain basin centres at art (624, 707) =
     world (765, 866) — 98px SOUTH of the player's spawn at (768, 768), which
     is why you stand just above it when you arrive.  (648, 812) puts him on
     open cobblestone off the fountain's west shoulder: clear of the basin rim
     (~76px radius), clear of the lamp post at world (633, 890), and in frame
     at spawn on a phone without standing between the player and the steps up
     to Mayor Bro.

     SIZE.  Normalised to the same frame Mayor Bro uses — 256x256, figure
     200px tall, feet on the y=223 baseline — so the two of them stand at one
     scale on one ground line.  He reads wider because he is a broad man
     holding a hammer, not because he is drawn bigger.

     NAME.  Deliberately "Blacksmith Bro", NOT "Blacksmith Bron": there is a
     dormant three-quest Bron chain in gameSystems.js (bron_1..3, gated on
     `unlocks: 'blacksmith'`), and getNpcQuest keys on the NPC's NAME — naming
     him Bron would silently switch that whole chain on.  CLAUDE.md's rule for
     a dormant content system is to confirm with the owner before building on
     it, so he ships as a townsfolk with flavour lines and the chain stays
     off until they ask for it.

     pathRadius 0 for the same reason as the mayor: a fixture you might one
     day talk to should be where you left him.  `phrases` is REQUIRED — the
     ambient-chat loop indexes it unguarded and an empty array throws. */
  id: 'blacksmith_bro',
  name: 'Blacksmith Bro',
  sprite: '/sprites/npc/blacksmith-bro.webp',
  portrait: '/sprites/npc/blacksmith-bro-head.webp',
  avatar: '🔨',
  color: '#d98b45',
  x: 1400, y: 640,
  spawnX: 1400, spawnY: 640,
  renderX: 1400, renderY: 640,
  hp: 100, maxHp: 100,
  noHp: true,
  alive: true,
  respawnAt: 0,
  pathRadius: 0,
  moveTimer: 0,
  targetX: 1400, targetY: 640,
  chatTimer: 11000,
  chatBubble: null,
  phrases: [
    'Bring me ore and we will talk.',
    'Copper first. Iron when you have earned it.',
    'That blade needs an edge.',
  ],
  canFollow: false,
  followZones: [],
  _facing: 'down',
  _questMarker: null,
  _hitThisSwing: false,
}, {
  /* ═══ v2.3.1775: THE STOREKEEPER, BEHIND HIS STALL ═══
     Owner: "a sprite sheet of a 'storekeeper' and the next image is of his
     stall."

     He stands on the fountain's EAST shoulder, mirroring the blacksmith's
     corner on the west, with his stall (worldProps.js) beside him — the stall
     is scenery, he is the character, and the two are placed against the same
     measured fountain centre at world (765, 866).

     He stands at the stall's front-left corner rather than behind the counter,
     and that is the art's decision rather than a preference: the stall is
     drawn as a COMPLETE stall — shelves, crates, barrels and goods fill its
     whole interior with no gap for a figure.  Standing him on the stall's own
     ground line hid him entirely (tried it, looked at it), and lifting him up
     the screen would float him behind the awning.  Beside it, a step forward,
     he reads as the vendor working his pitch — and because props sync before
     NPCs he draws over the stall's near edge, which is correct for someone
     standing closer to the camera than it.

     Same normalisation as the other two figures — 256x256, 200px tall, feet on
     y=223 — taken from row 0 column 1 of the sheet, a clean front-facing
     stand.  His portrait is cropped from the LARGE reference figure on the
     right of the same sheet rather than from the little one, so the dialogue
     chip is sharp instead of an upscale.

     No quests: the vendor building already owns buying and selling, and
     wiring a shop to him is a decision about where trade lives, not a
     rename.  He is townsfolk until the owner says otherwise. */
  id: 'storekeeper_bro',
  name: 'Storekeeper Bro',
  sprite: '/sprites/npc/storekeeper-bro.webp',
  portrait: '/sprites/npc/storekeeper-bro-head.webp',
  avatar: '🛒',
  color: '#4a90d9',
  x: 2520, y: 748,
  spawnX: 2520, spawnY: 748,
  renderX: 2520, renderY: 748,
  hp: 100, maxHp: 100,
  noHp: true,
  alive: true,
  respawnAt: 0,
  pathRadius: 0,
  moveTimer: 0,
  targetX: 2520, targetY: 748,
  chatTimer: 14000,
  chatBubble: null,
  phrases: [
    'Everything here has a price.',
    'Fresh stock, straight off the boat.',
    'Coin talks, friend.',
  ],
  canFollow: false,
  followZones: [],
  _facing: 'down',
  _questMarker: null,
  _hitThisSwing: false,
}];

/* ═══ v2.3.1918: MONSTER DISPLAY NAMES ═══
 * Owner: "Give monsters a name plate with their name and level beneath it
 * similar to how the player has their name plate."
 *
 * There was no player-facing monster name anywhere in the codebase before
 * this — monsters were only ever an `archetype` string plus a "Lv3" tag
 * over their head.  This is that missing table, and it is CLIENT-ONLY
 * cosmetic: it is not mirrored in server/src/data.js and must not be, or
 * test/mirror-audit.test.mjs will (correctly) start pinning a label.
 *
 * Keys are whatever lands on monster.archetype after applyZoneVariant, so
 * both the base archetypes and every zone variant appear here.
 */
export const MONSTER_DISPLAY_NAMES = {
  /* base archetypes (server/src/data.js spawn tables) */
  fodder: 'Slime',
  brute: 'Brute',
  stalker: 'Stalker',
  hexer: 'Hexer',
  volatile: 'Volatile',
  snowman: 'Snowman',
  swarm: 'Swarm',
  sentinel: 'Sentinel',
  /* zone variants (src/data/monsterVariants.js) */
  mummy: 'Mummy',
  skeleton: 'Skeleton',
  fireGoblin: 'Fire Goblin',
  fishman: 'Fishman',
  rockmonster: 'Rock Monster',
  mossSlime: 'Moss Slime',
  blueSlime: 'Blue Slime',
  mireWisp: 'Mire Wisp',
  thornShambler: 'Thorn Shambler',
  bogLurker: 'Bog Lurker',
};

/* The name to put on the plate.  Falls back to a title-cased version of the
 * archetype key rather than to an empty string, because the failure mode of
 * a missing entry should be a slightly-off name ("Fire Goblin" spelled from
 * `fireGoblin`) and not a blank plate floating under a monster — a new
 * archetype added server-side would otherwise ship as a nameless one. */
export function monsterDisplayName(arch) {
  if (!arch) return 'Monster';
  const known = MONSTER_DISPLAY_NAMES[arch];
  if (known) return known;
  return String(arch)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());
}
