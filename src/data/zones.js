/* ═══ HUB-AND-SPOKE WORLD — §14 ═══ */
export const ZONES = {
  town: {
    /* ═══ v2.3.1777: THE CLIFFTOP TOWN ═══
       Owner supplied two painted halves and asked for them as ONE town map,
       with the cliffs not walkable.  The art (tools/maps/build-town-v16.mjs)
       stitches to 3303x1024 — a wide semicircular plateau — so the zone is
       96x30 tiles = 3072x960 world px, an aspect of 3.20 against the art's
       3.226.  That 0.8% is a smaller stretch than the square town lived with
       (1254 art into 1536 world, 1.22x) and means the map is drawn very near
       1:1 instead of being blown up.

       This zone now HAS a walkability grid, which is new for town: the old
       square map was walk-anywhere because every edge was painted ground.
       Here the plateau ends in a cliff with a painted valley beyond it, so
       without collision you walk off the edge and stand in the sky. */
    /* ═══ v2.3.1813: A NEW PAIR OF HALVES, AND A DIFFERENT SHAPE ═══
       Owner: "I have a better map of Brotown that I want you to use.  The
       fusion should be better."  The v16 plateau was WIDE (3303x1024, 96x30
       tiles); this one is nearly square (1674x1774), so the zone has to
       change shape with it or the art gets stretched to 3x its aspect.
       52x55 tiles = 1664x1760 world px against the art's 1674x1774 — an
       aspect of 0.945 vs 0.944, so the map draws at 0.994:1, even closer to
       native than v16's 0.8% stretch.  TOWN_SPAWN (constants.js) and the
       World View trail-head (TOWN_EXITS, effects.js) both moved with it;
       they are the only two coordinates anchored to this zone's shape, and
       both were re-checked against the new art rather than converted. */
    /* ═══ v2.3.2628: THE TOWN IS BACK TO ITS OLD EXTENT ═══
       Owner: "Something happened with the town map and half of it got lost.
       It's supposed to be a fused map between two different maps to make it
       larger like it was before."

       The FUSION is intact and always was -- town_v17.webp is both painted
       halves, and tools/maps/build-town-v17.mjs still reproduces it.  What
       was lost is the SIZE, and it went at v2.3.1813 above: v16's plateau
       was 96x30 tiles = 3072x960 world px, and the near-square v17 art
       brought the zone to 52x55 = 1664x1760.  That is 46% narrower than the
       town the owner had been walking around, which is what "half of it"
       describes.

       68x72 = 2176x2304 world px, an aspect of 0.9444 against the art's
       1674x1774 = 0.9437 -- a 0.07% stretch, TIGHTER than the 52x55 box it
       replaces (0.10%) and far tighter than v16's 0.8%.  The art is drawn
       1.30x, uniformly.  That is not the v16 fusion's mistake: what made
       that one look bad was one half upscaled 1.4x RELATIVE to the other,
       so the seam joined sharp art to soft art.  Scaling the whole finished
       map by the same factor has no seam to mismatch, and this painting has
       no pixel grid to break.

       Area goes 2.93M -> 5.01M world px, 1.71x, and past v16's 2.95M in
       both axes.  PROP SIZES ARE DELIBERATELY UNCHANGED: a building is worth
       the same number of world px as before, so it draws the same size on
       screen and the extra room shows up as space BETWEEN buildings, which
       is the second half of what the owner asked for.  Everything anchored
       to this zone moved with it -- TOWN_SPAWN (constants.js), TOWN_EXITS
       (effects.js), every town prop (worldProps.js) and every town NPC
       (gameDisplay.js).  The walk mask is not one of them: town's collision
       is prop footprints only (WALK_MASKS_ENABLED is false, tiledMaps.js
       v2.3.1794), so there is no grid to re-derive. */
    id: 'town', name: 'Town', w: 68, h: 72,
    element: null, level: [0, 0], music: 'town', safe: true,
    palette: { ground: '#4a6741', path: '#8b7355', accent: '#5a7a50' }
  },
  /* ═══ v2.3.2978: THE WHEEL, the one seamless map, as its own zone ═══
     Owner: "can you place the monsters where they belong in their zones (on
     the ends closest to the central map)?"  `?trial=wheel` rode 'worldview',
     the safe empty hub, sharing that id with every ordinary World View player
     on a different map.  Against a worker that advertises caps.wheelmonsters
     it enters this zone instead (src/game/worldTrial.js trialZoneFor), where
     the server stands each element zone's own monsters at the inner end of
     its spoke (server/src/wheelzone.js).  NOT safe -- that is what lets them
     in -- but levels [1, 2] like every zone today, and no spawns of its own:
     the monsters are the server's, each carrying its `home` zone, which
     skins it.  The size is the Wheel's (43,008 px); worldTrial.js gives it
     the trial's look and exits at boot, as it gives 'worldview' them.
     MIRROR: server/src/data.js VALID_ZONE_IDS (zones.test.mjs). */
  wheel: {
    /* v2.3.3039: the name players see -- every loading screen ("Entering
       BroTown"), a friend's whereabouts, the world map's title -- is BroTown
       (owner: "Instead of 'the Wheel' on the loading screen just call it
       'BroTown'").  `wheel` stays the zone's id, and the Wheel its name in
       code and docs. */
    id: 'wheel', name: 'BroTown', w: 1344, h: 1344,
    element: null, level: [1, 2], music: 'town', safe: false,
    palette: { ground: '#1c467e', path: '#c9a36a', accent: '#86b94f' },
    spawns: [],
    sharedRows: true,
    /* the element zones whose monsters stand on it, in their spokes' order --
       MIRROR of server/src/wheelzone.js WHEEL.HOMES (wheelzone.test.mjs).
       Their art is this zone's art (monsterVariants.js variantsForZone) */
    homes: ['frost', 'ember', 'sky', 'hollows', 'thunder', 'tidal', 'mist', 'verdant'],
    /* v2.3.2990: the safe ground's radius round the Wheel's middle, game px --
       the commons and Brotown, where no monster goes after anyone; a player
       who has not yet spoken to Mayor Bro (and so carries no sword) stays
       inside it (src/game/wheelHome.js).  MIRROR of server/src/wheelspawns.js
       WHEEL_SAFE_R (test-world-core). */
    safeR: 2937,
    /* v2.3.2990: the middle of where each land's monsters stand, game px.  A
       quest naming a land says which one ("Frost Ridge"), and the gold road
       points at this spot (src/game/questRoute.js).  Every one of them stands
       within ~550 px of it.  MIRROR of server/src/wheelspawns.js
       WHEEL_SPAWNS[home].anchor (test-world-core). */
    lands: {
      frost: [18985, 18985], ember: [21504, 18050], sky: [23946, 19062], hollows: [24946, 21504],
      thunder: [23934, 23934], tidal: [21504, 24958], mist: [19087, 23921], verdant: [17966, 21504],
    },
    /* not a place to list: the encyclopedia's zones leave it out */
    hidden: true,
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
    /* ═══ v2.3.2257: THE VISTA KEEPS THE PRE-v2.3.2247 WIDTH RULE ═══
       Owner: "For character size in worldview revert to how big the character
       was previously.  He's too small in worldview now."
       He is: playerScale above already shrinks him on purpose, and v2.3.2247's
       per-zone floors then shrank the WORLD too -- 48x48 is 1536 world px, so
       this zone never reaches its own floor and drops to the flat
       FIGURE_SCALE_FLOOR.  0.50 against the 0.735 the old rule gave on a 430pt
       phone: 29.1 CSS px of character where there used to be 42.7.
       585 is `Math.round(390 * 1.5)` -- REF_VIEW_W at the WORLD_ZOOM of the
       day, read off worldViewport.js at 2deb56a, the commit before v2.3.2247.
       It is a floor like every other term, so it can only zoom IN and can
       never draw void: 1536 world px against a 585-wide view has room to
       spare.  worldViewport reads these; nothing else does.

       BOTH AXES, because the old rule had both.  The first cut carried only
       the width and applied it in either orientation, which is not the rule it
       claims to restore: sideways, pre-v2.3.2247 used REF_VIEW_H = 480 on the
       HEIGHT (the two-widths law, v2.3.2156).  Spending the width there gave
       844/585 = 1.443 -- the vista zoomed to nearly triple, the figure from
       31.9 to 83.9 CSS px.  Caught by putting a landscape row in the table. */
    refViewW: Math.round(390 * 1.5),   /* 585 -- portrait */
    refViewH: 480,                     /* sideways, the same commit's REF_VIEW_H */
    /* v2.3.4802: `playerLens` (v2.3.2124, the magnifying glass round your
       figure on the old World View) went with the old map */
  },
  meadow: {
    id: 'meadow', name: 'Starting Meadow', w: 32, h: 32,
    element: null, level: [1, 2] /* band: [1,10] */, music: 'meadow', safe: false,
    palette: { ground: '#3d6b2e', path: '#7a6a45', accent: '#5a9a40' },
    spawns: [{ arch: 'fodder', count: 6 }] /* v2.3.2244: six per zone (mirror of server/src/data.js) */
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
    spawns: [{ arch: 'fodder', count: 6 }],   /* v2.3.2244: six per zone (mirror of server/src/data.js) */
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
    spawns: [{ arch: 'fodder', count: 4 }, { arch: 'brute', count: 2 }],   /* v2.3.2244: six per zone (mirror of server/src/data.js) */
    atmosphere: { tint: 'rgba(30,90,30,0.05)', vignette: 'rgba(10,50,10,0.15)' },
    enemyEmoji: { fodder: '🍄', brute: '🌿', swarm: '🪲', hexer: '🧪', sentinel: '🪵' }
  },
  verdant: {
    id: 'verdant', name: 'Earth Forest',   /* v2.3.3778: the owner, "Rename verdant wilds to something like earth forest" */ w: 32, h: 32,
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
    /* v2.3.1675 (owner: "make the slimes in verdant wilds blue ... this is to
       make them stand out against the background").  Every spawn is blueSlime
       now — the mossy green reskin was the problem: a green slime on a green
       forest floor is camouflage, which is fine for a slime and terrible for
       a player trying to find one.  Blue is the only recolour in the set that
       is not somewhere in this zone's palette.
       mossSlime stays defined in monsterVariants.js: nothing spawns it today
       and deleting it would only have to be rewritten if a second Flora zone
       ever wants it.  MIRROR of server/src/data.js ZONES.verdant — the SERVER
       decides what spawns; this table only clamps levels and picks the skin,
       so both have to change or the zone keeps its green slimes. */
    spawns: [{ arch: 'fodder', count: 6, variant: 'blueSlime' }],   /* v2.3.2244: six per zone (mirror of server/src/data.js) */
    atmosphere: { tint: 'rgba(60,160,60,0.05)', vignette: 'rgba(20,80,20,0.12)' },
    enemyEmoji: {}
  },
  frost: {
    id: 'frost', name: 'Frost Ridge' /* v2.3.1438; v2.3.1439: owner — it's a mountain, no shore */, w: 32, h: 32,
    /* Elemental zone 1 — see ember note. */
    element: 'frost', secondary: 'storm', level: [1, 2] /* band: [8,25] */, music: 'frost', safe: false,
    palette: { ground: '#5a6a7a', path: '#8a9aaa', accent: '#3a5a8a' },
    spawns: [{ arch: 'snowman', count: 6 }],   /* v2.3.2244: six per zone (mirror of server/src/data.js) */
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
    spawns: [{ arch: 'fodder', count: 6 }],   /* v2.3.2244: six per zone (mirror of server/src/data.js) */
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
    spawns: [{ arch: 'brute', count: 6 }],   /* v2.3.2244: six per zone (mirror of server/src/data.js) */
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
    spawns: [{ arch: 'stalker', count: 2 }, { arch: 'hexer', count: 2 }, { arch: 'volatile', count: 2 }],   /* v2.3.2244: six per zone (mirror of server/src/data.js) */
    atmosphere: { tint: 'rgba(210,165,90,0.05)', vignette: 'rgba(150,100,40,0.08)' },
    enemyEmoji: { fodder: '🌬️', brute: '🦅', swarm: '🕊️', volatile: '🌪️', stalker: '🦉', hexer: '☁️', sentinel: '🗼' },
    /* v2.3.4862: its north-south `depth` ramp (v2.3.2745, v2.3.2790) is gone
       with the old map (docs/specs/dune-depth.md) */
  },
  tidal: {
    id: 'tidal', name: 'Water Caves' /* v2.3.1438 */, w: 32, h: 32,
    /* Elemental zone 1 — see ember note. */
    element: 'water', secondary: 'venom', level: [1, 2] /* band: [8,25] */, music: 'tidal', safe: false,
    palette: { ground: '#2a4a5a', path: '#4a6a7a', accent: '#2a6a9a' },
    /* v2.3.214: dropped swarm + hexer (emoji-only). brute is
       sprite-backed here via fishman variant. */
    spawns: [{ arch: 'brute', count: 6 }],   /* v2.3.2244: six per zone (mirror of server/src/data.js) */
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
    /* v2.3.3136: 32 x 44 tiles (1024 x 1408), src/data/farmLayout.js FARM_ZONE --
       tall enough that the view keeps the Wheel's size and scrolls (a zone
       shorter than the view is drawn whole, zoomed in: worldViewport.js) */
    id: 'farm_home', name: 'Your Farm', w: 32, h: 44,
    element: null, secondary: null, level: [0, 0], music: 'town', safe: true, personal: true,
    palette: { ground: '#4a7a3a', path: '#9a8a60', accent: '#5a9a40' },
    spawns: [],
    atmosphere: { tint: 'rgba(80,160,60,.03)', vignette: 'rgba(40,80,20,.06)' },
    enemyEmoji: {}
  },
};

/* v2.3.4862: the vista perspective curve (zonePlayerScale, v2.3.1574) and the
   dunes' depth (zoneDepthScale / depthK, v2.3.2745-2790) are gone with the old
   map: the World View's `playerScale` and Wind Dunes' `depth` were the only
   rows they read, and both zones are closed.  Every live zone drew at 1. */
/* ═══ v2.3.2978: THE WORLD VIEW, BY EITHER NAME ═══
   'worldview' is the hub town's World View exit leads to.  The Wheel trial
   rides it -- or, against a worker that runs the Wheel's monsters, its own
   zone 'wheel' (src/game/worldTrial.js trialZoneFor) -- and either way it is
   the same map, with the same exits, the same arrival and the same way home.
   Every hub rule written for 'worldview' (zoneTransitions.js, the exits and
   map in tileRenderer.js, the quest route, ...) asks this instead, so the
   Wheel keeps them all when its monsters arrive. */
export function isWorldViewZone(z) { return z === 'worldview' || z === 'wheel'; }
/* v2.3.2978: the zones whose monsters stand in this one -- the Wheel's eight
   lands -- or null for an ordinary zone, whose monsters are its own. */
export function zoneHomes(zoneId) {
  const z = Object.prototype.hasOwnProperty.call(ZONES, zoneId) ? ZONES[zoneId] : null;
  return z && Array.isArray(z.homes) ? z.homes : null;
}
/* v2.3.3017: which land's spoke a Wheel point is on -- the land whose anchor
   (ZONES.wheel.lands) lies nearest in direction from the Wheel's middle, the
   spokes being 45 degrees apart.  Everywhere has one, the commons included
   (it is only a direction); null outside the Wheel.  For the monsters' looks
   (rendering/wheelMonsterArt.js): your own land's load as you walk toward
   them, another land's only when one of its monsters is really near. */
/* ═══ v2.3.3315: THE WHEEL THE ROOM PLAYS ═══
   The owner: "Maybe 5x larger map is needed" -- "Rebuild for 5x".  The room
   plays the Wheel five times longer (its tiers five zones of walking, not
   one) unless its kill switch says the short one, and tells the phone which
   in caps.wheelsize (src/game/wheelSize.js).  Each one's size in tiles, its
   safe ground and its lands' middles -- MIRROR of server/src/wheelspawns1.js
   (1) and wheelspawns.js (5): WHEEL_WORLD / TILE, WHEEL_SAFE_R and
   WHEEL_SPAWNS[home].anchor (test-world-core).  setWheelGeom puts one on
   ZONES.wheel; it starts as the short one, as every worker before said.
   v2.3.3320: and on the long one `firstR`, how far from the middle each
   land's monsters begin -- its first stretch's inner edge, MIRROR of
   WHEEL_SPAWNS[home].band[0] (test-world-core) -- where a quest's road ends
   there (src/game/questRoute.js): a land's monsters reach ~2,400 px either
   side of its middle, and since the first stretch climbs 1 to 5
   (server/src/wheelzone.js) its middle is level 3. */
export const WHEEL_GEOM = Object.freeze({
  1: Object.freeze({ w: 1344, h: 1344, safeR: 2937, lands: Object.freeze({
    frost: [18985, 18985], ember: [21504, 18050], sky: [23946, 19062], hollows: [24946, 21504],
    thunder: [23934, 23934], tidal: [21504, 24958], mist: [19087, 23921], verdant: [17966, 21504],
  }) }),
  5: Object.freeze({ w: 5448, h: 5448, safeR: 2937, lands: Object.freeze({
    frost: [83198, 83198], ember: [87168, 81686], sky: [91087, 83249], hollows: [92698, 87168],
    thunder: [91087, 91087], tidal: [87168, 92674], mist: [83275, 91061], verdant: [81650, 87168],
  }), firstR: Object.freeze({
    frost: 3245, ember: 3089, sky: 3137, hollows: 3089, thunder: 3137, tidal: 3137, mist: 3101, verdant: 3209,
  }) }),
});
export function setWheelGeom(size) {
  const g = WHEEL_GEOM[size] || WHEEL_GEOM[1], z = ZONES.wheel;
  z.w = g.w; z.h = g.h; z.safeR = g.safeR; z.lands = g.lands;
  z.firstR = g.firstR || null;   /* v2.3.3320: the long Wheel's only */
  return g;
}

export function wheelLandAt(zoneId, x, y) {
  const z = zoneId === 'wheel' ? ZONES.wheel : null;
  if (!z || !z.lands || typeof x !== 'number' || typeof y !== 'number') return null;
  const c = (z.w * 32) / 2;   /* TILE: the Wheel's middle, 21504 (v2.3.3315: 87168 on the long one) */
  const a = Math.atan2(y - c, x - c);
  let best = null, bd = Infinity;
  for (const k in z.lands) {
    const p = z.lands[k];
    let d = Math.abs(Math.atan2(p[1] - c, p[0] - c) - a);
    if (d > Math.PI) d = 2 * Math.PI - d;
    if (d < bd) { bd = d; best = k; }
  }
  return best;
}

/* v2.3.1813 dev probe, house style (__btWorldProps, __btCoach).  mp-townmap
   already read `window.__btZones` — behind a `.catch(() => null)` that made a
   missing probe look like a skipped check rather than a failure, so the zone's
   dimensions went untested through two shape changes.  Defining it for real is
   the fix; the scenario no longer swallows the miss. */
if (typeof window !== 'undefined') window.__btZones = ZONES;
