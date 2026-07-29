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
    element: null, level: [1, 2] /* band: [1,10] */, music: 'meadow', safe: false,
    palette: { ground: '#3d6b2e', path: '#7a6a45', accent: '#5a9a40' },
    spawns: [{ arch: 'fodder', count: 10 }]
  },
  ember: {
    id: 'ember', name: 'Flame Fields' /* v2.3.1438: element-first names (owner) */, w: 32, h: 32,
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
       gating (follow-up) or a newbie can walk into a high-level entrance.
       v2.3.1160: bands RE-FLATTENED to [1,2] — OWNER DIRECTIVE
       (2026-07-04 playtest): "All zones at initial depth should be
       level 1 or 2. I have not made more depth zones yet since the
       game is still a demo."  The 1140 unpinning put ~L20 snowmen at
       the frost entrance (the world-view exit spawns at the DEEP end
       of the lerp).  Each zone keeps its MAP-REDESIGN band in a
       comment; restore them when depth content ships. */
    element: 'flame', secondary: 'stone', level: [1, 2] /* band: [55,80] */, music: 'ember', safe: false,
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
    id: 'mist', name: 'Poison Forest' /* v2.3.1438; v2.3.1439: owner wording */, w: 32, h: 32,
    /* Elemental zone 1 — see ember note. */
    element: 'venom', secondary: 'wind', level: [1, 2] /* band: [22,40] */, music: 'mist', safe: false,
    palette: { ground: '#2a4a2a', path: '#5a6a45', accent: '#3a5a30' },
    /* v2.3.214: all 3 spawn archetypes (swarm/stalker/hexer) were
       emoji-only; zone spawned nothing until sprite-backed monsters
       existed.  v2.3.1147: populated with tinted reskins of existing
       sheets (fodder->mireWisp violet slime, brute->bogLurker murky
       fishman -- see ZONE_VARIANT_MAP).  Closes the L25-38 dead band. */
    spawns: [{ arch: 'fodder', count: 6 }, { arch: 'brute', count: 4 }],
    atmosphere: { tint: 'rgba(30,90,30,0.05)', vignette: 'rgba(10,50,10,0.15)' },
    enemyEmoji: { fodder: '🍄', brute: '🌿', swarm: '🪲', hexer: '🧪', sentinel: '🪵' }
  },
  verdant: {
    id: 'verdant', name: 'Verdant Wilds', w: 32, h: 32,
    /* v2.3.856: new Flora spoke (band 2). element:null for now -- a real
       Flora element + sprite-backed monsters are a follow-up; reachable and
       walkable as a zone today.
       v2.3.1571 (owner: "add it to verdant wilds"): the follow-up landed.
       Flora exists as of v2.3.1569, so the Flora spoke finally carries its
       own element -- which is what makes Flora weapons droppable and the
       nine Flora collisions reachable in play.  Secondary is venom: the
       zone's own monsters are moss slimes and thorn shamblers, and venom
       is the element Flora beats on the wheel. */
    element: 'flora', secondary: 'venom', level: [1, 2] /* band: [22,40] */, music: 'meadow', safe: false,
    palette: { ground: '#3d7a2e', path: '#7a6a45', accent: '#6abf4f' },
    /* v2.3.1147: populated (was empty) -- tinted reskins: fodder->
       mossSlime green slime, brute->thornShambler mossy rockmonster.
       v2.3.1534 (owner: "remove the rock monster from this level"): the
       brute spawn is gone, so Verdant Wilds is slimes only.  Mirror of
       server/src/data.js ZONES.verdant -- the SERVER decides what
       spawns; this table only clamps levels and picks the skin, so both
       have to drop the entry or the zone keeps its rockmonsters.
       thornShambler stays defined in monsterVariants.js: nothing spawns
       it today, and deleting it would just have to be rewritten if a
       brute comes back here. */
    /* v2.3.1535 (owner: "one fast squishier blue slime and the rest the
       regular green"): the second entry's `variant` pins ONE spawn to
       blueSlime; the other 7 take the ZONE_VARIANT_MAP default (mossSlime,
       green).  A per-entry override is the only way to get a mixed
       population -- ZONE_VARIANT_MAP maps a whole ARCHETYPE, so putting
       blueSlime there would turn every slime in the zone blue. */
    spawns: [{ arch: 'fodder', count: 7 }, { arch: 'fodder', count: 1, variant: 'blueSlime' }],
    atmosphere: { tint: 'rgba(60,160,60,0.05)', vignette: 'rgba(20,80,20,0.12)' },
    enemyEmoji: {}
  },
  frost: {
    id: 'frost', name: 'Frost Ridge' /* v2.3.1438; v2.3.1439: owner — it's a mountain, no shore */, w: 32, h: 32,
    /* Elemental zone 1 — see ember note. */
    element: 'frost', secondary: 'storm', level: [1, 2] /* band: [8,25] */, music: 'frost', safe: false,
    palette: { ground: '#5a6a7a', path: '#8a9aaa', accent: '#3a5a8a' },
    spawns: [{ arch: 'snowman', count: 4 }],
    atmosphere: { tint: 'rgba(140,180,220,0.06)', vignette: 'rgba(60,100,160,0.10)' },
    enemyEmoji: { fodder: '❄️', brute: '🐻‍❄️', swarm: '🦅', volatile: '🧊', stalker: '🐺', hexer: '🌀', sentinel: '🏔️', snowman: '⛄' }
  },
  thunder: {
    id: 'thunder', name: 'Electric Foundry' /* v2.3.1438; v2.3.1439: owner — metal/futuristic place word */, w: 32, h: 32,
    /* Elemental zone 1 — see ember note. */
    element: 'storm', secondary: 'flame', level: [1, 2] /* band: [55,80] */, music: 'thunder', safe: false,
    palette: { ground: '#4a4a5a', path: '#6a6a7a', accent: '#7a5aaa' },
    /* v2.3.214: dropped volatile + stalker (emoji-only). Slime
       (fodder) still spawns in Thunder Peaks. */
    spawns: [{ arch: 'fodder', count: 6 }],
    atmosphere: { tint: 'rgba(100,70,170,0.05)', vignette: 'rgba(50,30,100,0.12)' },
    enemyEmoji: { fodder: '⚡', brute: '🗿', swarm: '🦇', hexer: '🌩️', sentinel: '⛰️' }
  },
  hollows: {
    id: 'hollows', name: 'Stone Hollows' /* v2.3.1438 */, w: 32, h: 32,
    /* Elemental zone 1 — see ember note. */
    element: 'stone', secondary: 'venom', level: [1, 2] /* band: [38,58] */, music: 'hollows', safe: false,
    palette: { ground: '#3a3a3a', path: '#5a5a5a', accent: '#6a5a4a' },
    /* v2.3.214: dropped sentinel + swarm (emoji-only). brute is
       sprite-backed here via rockmonster variant. */
    spawns: [{ arch: 'brute', count: 4 }],
    atmosphere: { tint: 'rgba(80,70,50,0.06)', vignette: 'rgba(30,25,15,0.18)' },
    enemyEmoji: { fodder: 'rubble', brute: 'rock', swarm: 'scorp', volatile: 'gem', hexer: 'urn' }
  },
  sky: {
    id: 'sky', name: 'Wind Dunes' /* v2.3.1438 */, w: 32, h: 32,
    /* Elemental zone 1 — see ember note. */
    element: 'wind', secondary: 'frost', level: [1, 2] /* band: [38,58] */, music: 'sky', safe: false,
    /* v2.3.855: warm desert palette (replaces the old cool "Sky Reaches" blue-grey). */
    palette: { ground: '#c2a060', path: '#b08a4a', accent: '#9c6a38' },
    /* ZONE_VARIANT_MAP.sky remaps every archetype here to a mummy that
       transforms to a skeleton at 50% HP (see monsterVariants.js).
       v2.3.1144: dropped the extra fodder×6 that only existed client-side —
       the server table (authoritative for spawns since server monsters
       shipped) never had it, so MP players already saw the 10-monster mix;
       zones.test.mjs now asserts the two tables stay in lockstep. */
    spawns: [{ arch: 'stalker', count: 4 }, { arch: 'hexer', count: 3 }, { arch: 'volatile', count: 3 }],
    atmosphere: { tint: 'rgba(210,165,90,0.05)', vignette: 'rgba(150,100,40,0.08)' },
    enemyEmoji: { fodder: '🌬️', brute: '🦅', swarm: '🕊️', volatile: '🌪️', stalker: '🦉', hexer: '☁️', sentinel: '🗼' }
  },
  tidal: {
    id: 'tidal', name: 'Water Caves' /* v2.3.1438 */, w: 32, h: 32,
    /* Elemental zone 1 — see ember note. */
    element: 'water', secondary: 'venom', level: [1, 2] /* band: [8,25] */, music: 'tidal', safe: false,
    palette: { ground: '#2a4a5a', path: '#4a6a7a', accent: '#2a6a9a' },
    /* v2.3.214: dropped swarm + hexer (emoji-only). brute is
       sprite-backed here via fishman variant. */
    spawns: [{ arch: 'brute', count: 3 }],
    atmosphere: { tint: 'rgba(30,80,120,0.05)', vignette: 'rgba(10,40,80,0.12)' },
    enemyEmoji: { fodder: 'fish', brute: 'fishman', swarm: 'octo', volatile: 'bubble', stalker: 'shark', hexer: 'wave', sentinel: 'shell' }
  },
  shadow: {
    id: 'shadow', name: 'Dark Sanctum' /* v2.3.1438 */, w: 40, h: 40,
    element: 'dark', secondary: null, level: [1, 2] /* band: [81,90] */, music: 'shadow', safe: false, endgame: true,
    palette: { ground: '#1a1a2a', path: '#2a2a3a', accent: '#3a2a4a' },
    /* v2.3.214: all 3 spawn archetypes were emoji-only. */
    spawns: [],
    atmosphere: { tint: 'rgba(20,10,40,0.10)', vignette: 'rgba(0,0,20,0.25)' },
    enemyEmoji: { fodder: '👤', brute: '👹', swarm: '🦇', volatile: '💀', hexer: '🔮', sentinel: '⚰️' }
  },
  radiant: {
    id: 'radiant', name: 'Light Summit' /* v2.3.1438 */, w: 40, h: 40,
    element: 'light', secondary: null, level: [1, 2] /* band: [81,100] */, music: 'radiant', safe: false, endgame: true,
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

/* v2.3.1574: the ONE copy of the vista perspective curve.
 *
 * A zone may carry `playerScale` to sell depth on a zoomed-out map: a flat
 * number, or { near, far, curve } scaling by distance from the zone centre so
 * a figure on a distant trail renders as a speck (worldview: 0.55 at the
 * plateau down to 0.03 at the rim).
 *
 * This math had drifted into THREE hand-copied sites -- entityRenderer's
 * _zonePscale (local + remote bodies), BroTown's vistaSpeedMult (movement),
 * and a fourth that was simply MISSING: the remote harvest stand-ins in
 * effectsRenderer, which is why another player cooking or lighting a fire on
 * the worldview drew at full size next to their own thumbnail-sized body.
 * A shrink curve that only some of a character's parts obey is not a curve,
 * so it lives here now and every site calls it.
 */
export function zonePlayerScale(zoneId, x, y, TILE) {
  const z = ZONES[zoneId];
  const ps = z && z.playerScale;
  if (typeof ps === 'number') return ps;
  if (ps && typeof ps === 'object') {
    const cx = (z.w * TILE) / 2, cy = (z.h * TILE) / 2;
    const d = Math.min(1, Math.hypot(x - cx, y - cy) / (Math.hypot(cx, cy) || 1));
    const near = ps.near != null ? ps.near : 0.6;
    const far = ps.far != null ? ps.far : 0.3;
    const curve = ps.curve != null ? ps.curve : 1;   /* <1 shrinks faster off-centre */
    return near + (far - near) * Math.pow(d, curve);
  }
  return 1;
}
