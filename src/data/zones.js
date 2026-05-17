/* ═══ HUB-AND-SPOKE WORLD — §14 ═══ */
export const ZONES = {
  town: {
    /* 32x32 tiles = 1024x1024 px world bounds.  The new pixel-art
       town_v4.jpg is 1254x1254; the IMAGE_ZONE_MAPS sprite scales
       it to 1024x1024 — slight downscale, no perceptible quality
       loss at gameplay zoom.  All cells walkable (no walkability
       JSON loaded). */
    id: 'town', name: 'Town', w: 32, h: 32,
    element: null, level: [0, 0], music: 'town', safe: true,
    palette: { ground: '#4a6741', path: '#8b7355', accent: '#5a7a50' }
  },
  meadow: {
    id: 'meadow', name: 'Starting Meadow', w: 32, h: 32,
    element: null, level: [1, 10], music: 'meadow', safe: false,
    palette: { ground: '#3d6b2e', path: '#7a6a45', accent: '#5a9a40' },
    spawns: [{ arch: 'fodder', count: 10 }]
  },
  ember: {
    id: 'ember', name: 'Ember Fields', w: 32, h: 32,
    element: 'flame', secondary: 'stone', level: [1, 10], music: 'ember', safe: false,
    palette: { ground: '#5a3a2a', path: '#8b6545', accent: '#a04020' },
    spawns: [{ arch: 'fireGoblin', count: 6 }, { arch: 'brute', count: 3 }, { arch: 'volatile', count: 4 }],
    atmosphere: { tint: 'rgba(180,60,20,0.06)', vignette: 'rgba(120,30,0,0.12)' },
    enemyEmoji: { fodder: '🔥', brute: '🌋', swarm: '🦎', volatile: '💣', hexer: '🧙', sentinel: '⚔️' }
  },
  mist: {
    id: 'mist', name: 'Mistwood', w: 32, h: 32,
    element: 'venom', secondary: 'wind', level: [1, 10], music: 'mist', safe: false,
    palette: { ground: '#2a4a2a', path: '#5a6a45', accent: '#3a5a30' },
    spawns: [{ arch: 'swarm', count: 5 }, { arch: 'stalker', count: 3 }, { arch: 'hexer', count: 3 }],
    atmosphere: { tint: 'rgba(30,90,30,0.05)', vignette: 'rgba(10,50,10,0.15)' },
    enemyEmoji: { fodder: '🍄', brute: '🌿', swarm: '🪲', hexer: '🧪', sentinel: '🪵' }
  },
  frost: {
    id: 'frost', name: 'Frozen Shore', w: 32, h: 32,
    element: 'frost', secondary: 'storm', level: [1, 10], music: 'frost', safe: false,
    palette: { ground: '#5a6a7a', path: '#8a9aaa', accent: '#3a5a8a' },
    spawns: [{ arch: 'snowman', count: 4 }],
    atmosphere: { tint: 'rgba(140,180,220,0.06)', vignette: 'rgba(60,100,160,0.10)' },
    enemyEmoji: { fodder: '❄️', brute: '🐻‍❄️', swarm: '🦅', volatile: '🧊', stalker: '🐺', hexer: '🌀', sentinel: '🏔️', snowman: '⛄' }
  },
  thunder: {
    id: 'thunder', name: 'Thunder Peaks', w: 32, h: 32,
    element: 'storm', secondary: 'flame', level: [1, 10], music: 'thunder', safe: false,
    palette: { ground: '#4a4a5a', path: '#6a6a7a', accent: '#7a5aaa' },
    spawns: [{ arch: 'fodder', count: 6 }, { arch: 'volatile', count: 4 }, { arch: 'stalker', count: 3 }],
    atmosphere: { tint: 'rgba(100,70,170,0.05)', vignette: 'rgba(50,30,100,0.12)' },
    enemyEmoji: { fodder: '⚡', brute: '🗿', swarm: '🦇', hexer: '🌩️', sentinel: '⛰️' }
  },
  hollows: {
    id: 'hollows', name: 'Deep Hollows', w: 32, h: 32,
    element: 'stone', secondary: 'venom', level: [1, 10], music: 'hollows', safe: false,
    palette: { ground: '#3a3a3a', path: '#5a5a5a', accent: '#6a5a4a' },
    spawns: [{ arch: 'brute', count: 4 }, { arch: 'sentinel', count: 3 }, { arch: 'swarm', count: 4 }],
    atmosphere: { tint: 'rgba(80,70,50,0.06)', vignette: 'rgba(30,25,15,0.18)' },
    enemyEmoji: { fodder: '🪨', brute: '🦏', swarm: '🦂', volatile: '💎', hexer: '⚱️' }
  },
  sky: {
    id: 'sky', name: 'Desert Winds', w: 32, h: 32,
    element: 'wind', secondary: 'frost', level: [1, 10], music: 'sky', safe: false,
    palette: { ground: '#6a7a8a', path: '#aabbcc', accent: '#8a9aaa' },
    spawns: [{ arch: 'stalker', count: 4 }, { arch: 'hexer', count: 3 }, { arch: 'volatile', count: 3 }],
    atmosphere: { tint: 'rgba(160,190,210,0.04)', vignette: 'rgba(100,140,180,0.06)' },
    enemyEmoji: { fodder: '🌬️', brute: '🦅', swarm: '🕊️', volatile: '🌪️', stalker: '🦉', hexer: '☁️', sentinel: '🗼' }
  },
  tidal: {
    id: 'tidal', name: 'Tidal Caves', w: 32, h: 32,
    element: 'water', secondary: 'venom', level: [1, 10], music: 'tidal', safe: false,
    palette: { ground: '#2a4a5a', path: '#4a6a7a', accent: '#2a6a9a' },
    spawns: [{ arch: 'swarm', count: 4 }, { arch: 'hexer', count: 4 }, { arch: 'brute', count: 3 }],
    atmosphere: { tint: 'rgba(30,80,120,0.05)', vignette: 'rgba(10,40,80,0.12)' },
    enemyEmoji: { fodder: '🐟', brute: '🦀', swarm: '🐙', volatile: '🫧', stalker: '🦈', hexer: '🌊', sentinel: '🐚' }
  },
  shadow: {
    id: 'shadow', name: 'Shadow Sanctum', w: 40, h: 40,
    element: 'dark', secondary: null, level: [81, 100], music: 'shadow', safe: false, endgame: true,
    palette: { ground: '#1a1a2a', path: '#2a2a3a', accent: '#3a2a4a' },
    spawns: [{ arch: 'hexer', count: 4 }, { arch: 'sentinel', count: 3 }, { arch: 'stalker', count: 4 }],
    atmosphere: { tint: 'rgba(20,10,40,0.10)', vignette: 'rgba(0,0,20,0.25)' },
    enemyEmoji: { fodder: '👤', brute: '👹', swarm: '🦇', volatile: '💀', hexer: '🔮', sentinel: '⚰️' }
  },
  radiant: {
    id: 'radiant', name: 'Radiant Heights', w: 40, h: 40,
    element: 'light', secondary: null, level: [81, 100], music: 'radiant', safe: false, endgame: true,
    palette: { ground: '#6a6a4a', path: '#aaa870', accent: '#ccc060' },
    spawns: [{ arch: 'brute', count: 4 }, { arch: 'swarm', count: 4 }, { arch: 'volatile', count: 3 }],
    atmosphere: { tint: 'rgba(240,200,60,0.04)', vignette: 'rgba(200,180,40,0.06)' },
    enemyEmoji: { fodder: '✨', brute: '🦁', swarm: '🐝', volatile: '☀️', stalker: '🦅', hexer: '🌟', sentinel: '🏛️' }
  },
  wasteland: {
    id: 'wasteland', name: 'The Lawless Land', w: 60, h: 50,
    element: null, secondary: null, level: [1, 100], music: null, safe: false, lawless: true,
    palette: { ground: '#3a3228', path: '#5a4a38', accent: '#2a2218' },
    spawns: [],
    atmosphere: { tint: 'rgba(40,20,10,.08)', vignette: 'rgba(0,0,0,.30)' },
    enemyEmoji: {}
  },
  farm_home: {
    id: 'farm_home', name: 'Your Farm', w: 30, h: 25,
    element: null, secondary: null, level: [0, 0], music: 'town', safe: true, personal: true,
    palette: { ground: '#4a7a3a', path: '#9a8a60', accent: '#5a9a40' },
    spawns: [],
    atmosphere: { tint: 'rgba(80,160,60,.03)', vignette: 'rgba(40,80,20,.06)' },
    enemyEmoji: {}
  },
};
