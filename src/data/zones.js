/* ═══ HUB-AND-SPOKE WORLD — §14 ═══ */
export const ZONES = {
  town: {
    /* v2.3.386: town is 48x48 tiles = 1536x1536 px world bounds (was
       32x32) -- 1.5x playable area per user (tried 2x/64x64 first).
       Background art (town_v13.jpg) is 1536x1536 native to match (square
       painterly source, gentle upscale).  All cells walkable (no
       walkability JSON).  TOWN_EXITS / TOWN_BUILDINGS / spawn scaled x1.5
       to suit the grid. */
    id: 'town', name: 'Town', w: 48, h: 48,
    element: null, level: [0, 0], music: 'town', safe: true,
    palette: { ground: '#4a6741', path: '#8b7355', accent: '#5a7a50' }
  },
  worldview: {
    /* v2.3.859: zoomed-out hub map. The town is the small circle at its
       centre; trails branch to every region (WORLDVIEW_EXITS). The avatar
       renders as a speck toward the distant trails (playerScale) and moves
       slower there (BroTown movement), to sell the vista's depth. */
    id: 'worldview', name: 'World View', w: 48, h: 48,
    element: null, level: [0, 0], music: 'town', safe: true,
    palette: { ground: '#b89a5a', path: '#cdb27a', accent: '#7aa050' },
    spawns: [],
    atmosphere: { tint: 'rgba(180,200,230,0.03)', vignette: 'rgba(80,110,150,0.05)' },
    playerScale: { near: 0.55, far: 0.03, curve: 0.6 }
  },
  meadow: {
    id: 'meadow', name: 'Starting Meadow', w: 32, h: 32,
    element: null, level: [1, 10], music: 'meadow', safe: false,
    palette: { ground: '#3d6b2e', path: '#7a6a45', accent: '#5a9a40' },
    spawns: [{ arch: 'fodder', count: 10 }]
  },
  ember: {
    id: 'ember', name: 'Ember Fields', w: 32, h: 32,
    /* v2.3.1140: bands UNPINNED (were flattened to [1,1] behind BF-1 --
       monster HP outran player damage mid-band; fixed by the flattened
       MONSTER_HP_CURVE in gameSystems.js, sim-verified).  Bands per
       docs/MAP-REDESIGN.md: each spoke owns a slice of 1-100 so players
       converge by level (50-player density); the depthPct lerp ramps
       monsters from the low end (entry) to the high end (deep).  Keep
       in lockstep with server/src/data.js ZONES -- applyZoneVariant
       clamps server-sent monster levels to THIS table, so a stale band
       here visibly downgrades monsters. Bands:
       meadow 1-10 | frost+tidal 8-25 | verdant+mist 22-40 |
       desert(sky)+hollows 38-58 | thunder+ember 55-80 | shadow/radiant 81-100.
       NOTE: every spoke is reachable from town, so high bands still want entry
       gating (follow-up) or a newbie can walk into a high-level entrance. */
    element: 'flame', secondary: 'stone', level: [55, 80], music: 'ember', safe: false,
    palette: { ground: '#5a3a2a', path: '#8b6545', accent: '#a04020' },
    /* Variant: ember fodder renders as fireGoblin (see monsterVariants.js
       ZONE_VARIANT_MAP).  zones.js stays in base-archetype terms; the
       variant layer rewires the skin without touching this file. */
    /* v2.3.214: emoji-only archetypes (brute, volatile) removed from
       ember spawns -- user clearing placeholders before authoring
       sprite-backed monsters one at a time. Only fodder remains
       because it variants to fireGoblin (sprite-backed) here. */
    spawns: [{ arch: 'fodder', count: 6 }],
    atmosphere: { tint: 'rgba(180,60,20,0.06)', vignette: 'rgba(120,30,0,0.12)' },
    enemyEmoji: { fodder: '🔥', brute: '🌋', swarm: '🦎', volatile: '💣', hexer: '🧙', sentinel: '⚔️' }
  },
  mist: {
    id: 'mist', name: 'Mistwood', w: 32, h: 32,
    /* Elemental zone 1 — see ember note. */
    element: 'venom', secondary: 'wind', level: [22, 40], music: 'mist', safe: false,
    palette: { ground: '#2a4a2a', path: '#5a6a45', accent: '#3a5a30' },
    /* v2.3.214: all 3 spawn archetypes (swarm/stalker/hexer) were
       emoji-only; zone now spawns nothing until a sprite-backed
       monster is added for Mistwood. */
    spawns: [],
    atmosphere: { tint: 'rgba(30,90,30,0.05)', vignette: 'rgba(10,50,10,0.15)' },
    enemyEmoji: { fodder: '🍄', brute: '🌿', swarm: '🪲', hexer: '🧪', sentinel: '🪵' }
  },
  verdant: {
    id: 'verdant', name: 'Verdant Wilds', w: 32, h: 32,
    /* v2.3.856: new Flora spoke (band 2). element:null for now -- a real
       Flora element + sprite-backed monsters are a follow-up; reachable and
       walkable as a zone today. */
    element: null, secondary: null, level: [22, 40], music: 'meadow', safe: false,
    palette: { ground: '#3d7a2e', path: '#7a6a45', accent: '#6abf4f' },
    spawns: [],
    atmosphere: { tint: 'rgba(60,160,60,0.05)', vignette: 'rgba(20,80,20,0.12)' },
    enemyEmoji: {}
  },
  frost: {
    id: 'frost', name: 'Frozen Shore', w: 32, h: 32,
    /* Elemental zone 1 — see ember note. */
    element: 'frost', secondary: 'storm', level: [8, 25], music: 'frost', safe: false,
    palette: { ground: '#5a6a7a', path: '#8a9aaa', accent: '#3a5a8a' },
    spawns: [{ arch: 'snowman', count: 4 }],
    atmosphere: { tint: 'rgba(140,180,220,0.06)', vignette: 'rgba(60,100,160,0.10)' },
    enemyEmoji: { fodder: '❄️', brute: '🐻‍❄️', swarm: '🦅', volatile: '🧊', stalker: '🐺', hexer: '🌀', sentinel: '🏔️', snowman: '⛄' }
  },
  thunder: {
    id: 'thunder', name: 'Thunder Peaks', w: 32, h: 32,
    /* Elemental zone 1 — see ember note. */
    element: 'storm', secondary: 'flame', level: [55, 80], music: 'thunder', safe: false,
    palette: { ground: '#4a4a5a', path: '#6a6a7a', accent: '#7a5aaa' },
    /* v2.3.214: dropped volatile + stalker (emoji-only). Slime
       (fodder) still spawns in Thunder Peaks. */
    spawns: [{ arch: 'fodder', count: 6 }],
    atmosphere: { tint: 'rgba(100,70,170,0.05)', vignette: 'rgba(50,30,100,0.12)' },
    enemyEmoji: { fodder: '⚡', brute: '🗿', swarm: '🦇', hexer: '🌩️', sentinel: '⛰️' }
  },
  hollows: {
    id: 'hollows', name: 'Deep Hollows', w: 32, h: 32,
    /* Elemental zone 1 — see ember note. */
    element: 'stone', secondary: 'venom', level: [38, 58], music: 'hollows', safe: false,
    palette: { ground: '#3a3a3a', path: '#5a5a5a', accent: '#6a5a4a' },
    /* v2.3.214: dropped sentinel + swarm (emoji-only). brute is
       sprite-backed here via rockmonster variant. */
    spawns: [{ arch: 'brute', count: 4 }],
    atmosphere: { tint: 'rgba(80,70,50,0.06)', vignette: 'rgba(30,25,15,0.18)' },
    enemyEmoji: { fodder: 'rubble', brute: 'rock', swarm: 'scorp', volatile: 'gem', hexer: 'urn' }
  },
  sky: {
    id: 'sky', name: 'Desert Winds', w: 32, h: 32,
    /* Elemental zone 1 — see ember note. */
    element: 'wind', secondary: 'frost', level: [38, 58], music: 'sky', safe: false,
    /* v2.3.855: warm desert palette (replaces the old cool "Sky Reaches" blue-grey). */
    palette: { ground: '#c2a060', path: '#b08a4a', accent: '#9c6a38' },
    /* fodder count is the seed for the mummy variant -- ZONE_VARIANT_MAP.sky
       remaps every fodder spawn here to a mummy that transforms to a
       skeleton at 50% HP (see monsterVariants.js).  Kept stalker/hexer/
       volatile for variety; if you want pure mummies in Desert Winds,
       drop the other entries. */
    spawns: [{ arch: 'fodder', count: 6 }, { arch: 'stalker', count: 4 }, { arch: 'hexer', count: 3 }, { arch: 'volatile', count: 3 }],
    atmosphere: { tint: 'rgba(210,165,90,0.05)', vignette: 'rgba(150,100,40,0.08)' },
    enemyEmoji: { fodder: '🌬️', brute: '🦅', swarm: '🕊️', volatile: '🌪️', stalker: '🦉', hexer: '☁️', sentinel: '🗼' }
  },
  tidal: {
    id: 'tidal', name: 'Tidal Caves', w: 32, h: 32,
    /* Elemental zone 1 — see ember note. */
    element: 'water', secondary: 'venom', level: [8, 25], music: 'tidal', safe: false,
    palette: { ground: '#2a4a5a', path: '#4a6a7a', accent: '#2a6a9a' },
    /* v2.3.214: dropped swarm + hexer (emoji-only). brute is
       sprite-backed here via fishman variant. */
    spawns: [{ arch: 'brute', count: 3 }],
    atmosphere: { tint: 'rgba(30,80,120,0.05)', vignette: 'rgba(10,40,80,0.12)' },
    enemyEmoji: { fodder: 'fish', brute: 'fishman', swarm: 'octo', volatile: 'bubble', stalker: 'shark', hexer: 'wave', sentinel: 'shell' }
  },
  shadow: {
    id: 'shadow', name: 'Shadow Sanctum', w: 40, h: 40,
    element: 'dark', secondary: null, level: [81, 90], music: 'shadow', safe: false, endgame: true,
    palette: { ground: '#1a1a2a', path: '#2a2a3a', accent: '#3a2a4a' },
    /* v2.3.214: all 3 spawn archetypes were emoji-only. */
    spawns: [],
    atmosphere: { tint: 'rgba(20,10,40,0.10)', vignette: 'rgba(0,0,20,0.25)' },
    enemyEmoji: { fodder: '👤', brute: '👹', swarm: '🦇', volatile: '💀', hexer: '🔮', sentinel: '⚰️' }
  },
  radiant: {
    id: 'radiant', name: 'Radiant Heights', w: 40, h: 40,
    element: 'light', secondary: null, level: [81, 100], music: 'radiant', safe: false, endgame: true,
    palette: { ground: '#6a6a4a', path: '#aaa870', accent: '#ccc060' },
    /* v2.3.214: all 3 spawn archetypes were emoji-only here (raw
       brute has no sprite variant in radiant; swarm + volatile are
       always emoji). */
    spawns: [],
    atmosphere: { tint: 'rgba(240,200,60,0.04)', vignette: 'rgba(200,180,40,0.06)' },
    enemyEmoji: { fodder: '✨', brute: '🦁', swarm: '🐝', volatile: '☀️', stalker: '🦅', hexer: '🌟', sentinel: '🏛️' }
  },
  /* v2.3.788: wasteland ('The Lawless Land') removed — the Ferryman NPC
     was despawned long before (NPC_DATA emptied), leaving the zone
     unreachable; owner confirmed removal 2026-06-12. */
  farm_home: {
    id: 'farm_home', name: 'Your Farm', w: 30, h: 25,
    element: null, secondary: null, level: [0, 0], music: 'town', safe: true, personal: true,
    palette: { ground: '#4a7a3a', path: '#9a8a60', accent: '#5a9a40' },
    spawns: [],
    atmosphere: { tint: 'rgba(80,160,60,.03)', vignette: 'rgba(40,80,20,.06)' },
    enemyEmoji: {}
  },
};
